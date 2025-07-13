from contextlib import asynccontextmanager
import logging
import asyncio
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.websockets import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import StreamingResponse
from enum import Enum
import gc

from service.model import (
    CommunicationAgent,
    MemoryAgent,
    VoiceCommunicationAgent,
    VoiceMemoryAgent,
)
from service.utils.prompts_store import PromptsStore


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class Mode(Enum):
    TEXT = "text"
    VOICE = "voice"


prompts_store: Optional[PromptsStore] = None
memory_agent: Optional[MemoryAgent] = None
memory_queue: Optional[asyncio.Queue] = None
comm_agent: Optional[CommunicationAgent] = None
voice_agent: Optional[VoiceCommunicationAgent] = None
voice_memory_agent: Optional[VoiceMemoryAgent] = None
current_mode: Mode = Mode.TEXT


async def memory_processor():
    global memory_queue, memory_agent, voice_memory_agent

    while True:
        try:
            user_message = await memory_queue.get()

            if current_mode == Mode.TEXT:
                asyncio.create_task(memory_agent.store_memory(user_message))
            else:
                asyncio.create_task(voice_memory_agent.store_memory(user_message))
            memory_queue.task_done()
        except asyncio.CancelledError:
            logging.error("Memory processor cancelled")
            break
        except Exception as e:
            logging.error(f"Error in memory processor: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    global prompts_store, memory_agent, memory_queue, comm_agent, voice_agent, voice_memory_agent
    prompts_store = PromptsStore()
    memory_agent = MemoryAgent()
    comm_agent = CommunicationAgent()
    memory_queue = asyncio.Queue(maxsize=1000)

    memory_task = asyncio.create_task(memory_processor())

    yield

    if memory_task and not memory_task.done():
        memory_task.cancel()
        try:
            await memory_task
        except asyncio.CancelledError:
            pass

    # Clean up the ML models and release the resources
    prompts_store = None
    memory_agent = None
    memory_queue = None
    comm_agent = None
    voice_agent = None
    voice_memory_agent = None


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PromptRequest(BaseModel):
    frontendTools: str
    prompt: str


class ToolCallResultRequest(BaseModel):
    result: str


@app.post("/prompt")
async def generate_prompt(request: PromptRequest):
    prompt_with_tools = f"{request.frontendTools}\n\n{request.prompt}"
    response = []
    async for chunk in comm_agent.generate(prompt_with_tools):
        response.append(chunk)
    response = "".join(response)
    prompt_id = prompts_store.store_prompt_and_result(
        prompt=prompt_with_tools, response=response
    )

    # Fire and forget into memory queue and return HTTP result
    memory_queue.put_nowait(request.prompt)
    return {"response": response, "promptId": prompt_id}


@app.patch("/tool-call/{promptId}")
async def update_tool_call(promptId: str, request: ToolCallResultRequest):
    prompts_store.update_tool_call_result(
        prompt_id=promptId, tool_call_result=request.result
    )
    return {"status": "ok"}


@app.post("/aprompt")
async def generate_aprompt(request: PromptRequest):
    global current_mode

    if current_mode != Mode.TEXT:
        raise HTTPException(
            status_code=500,
            detail="Switch to text mode first using '/switch?mode='voice''",
        )

    prompt_with_tools = f"{request.frontendTools}\n\n{request.prompt}"

    async def generate_chunks():
        full_response = []
        async for chunk in comm_agent.generate(prompt_with_tools):
            full_response.append(chunk)
            yield f"data: {chunk}\n\n"

        # These operations happen after the entire message has been streamed
        response_str = "".join(full_response)
        prompt_id = prompts_store.store_prompt_and_result(
            prompt=prompt_with_tools, response=response_str
        )
        memory_queue.put_nowait(request.prompt)

    return StreamingResponse(generate_chunks(), media_type="text/event-stream")


@app.post("/vprompt")
async def generate_vprompt():
    global current_mode

    if current_mode != Mode.VOICE:
        raise HTTPException(
            status_code=500,
            detail="Switch to voice mode first using '/switch?mode='voice''",
        )

    memory_queue.put_nowait("")
    return {"response": voice_agent.generate("")}


@app.post("/switch")
async def switch_mode(mode: Mode):
    global current_mode
    global comm_agent, voice_agent
    global memory_agent, voice_memory_agent

    if mode == current_mode:
        logger.info(f"Nothing to switch, already in {mode.value}")
        return {"status": "ok"}

    logger.info(f"Switching from {current_mode.value} to {mode.value}")

    if mode == Mode.TEXT and current_mode == Mode.VOICE:
        logger.info("Off-loading voice agents, loading text agents")
        voice_agent = None
        voice_memory_agent = None
        gc.collect()

        comm_agent = CommunicationAgent()
        memory_agent = MemoryAgent()
        logger.info("Successfully loaded text agents")
    elif mode == Mode.VOICE and current_mode == Mode.TEXT:
        logger.info("Off-loading text agents, loading voice agents")
        comm_agent = None
        memory_agent = None
        gc.collect()

        voice_agent = VoiceCommunicationAgent()
        voice_memory_agent = VoiceMemoryAgent()
        logger.info("Successfully loaded voice agents")
    else:
        raise HTTPException(status_code=500, detail="Invalid state, restart server!")

    current_mode = mode

    return {"status": "ok"}


@app.websocket("/voice-stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        audio_buffer = bytearray()
        while True:
            message = await websocket.receive()
            if "bytes" in message:
                audio_buffer.extend(message["bytes"])
                logger.info(f"Received chunk of size: {len(message['bytes'])}")
            elif "text" in message and message["text"] == "DONE":
                # This assumes frontend sends a "DONE" message to indicate end
                logger.info(f"Total audio received: {len(audio_buffer)} bytes")

                # Optionally save to file
                with open("received_audio.wav", "wb") as f:
                    f.write(audio_buffer)

                await websocket.send_text("Received audio successfully!")
                break
    except WebSocketDisconnect:
        logger.info("Client disconnected from voice stream")
    except Exception as e:
        logger.error(f"Error in voice stream: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, workers=1)
