from contextlib import asynccontextmanager
import logging
import asyncio
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import StreamingResponse
from enum import Enum
import gc
import uuid
from pathlib import Path
from dotenv import load_dotenv


load_dotenv()

from service.agents import (
    CommunicationAgent,
    MemoryAgent,
    VoiceCommunicationAgent,
    VoiceMemoryAgent,
)


logging.basicConfig(level=logging.DEBUG)
otlp_exporter_logger = logging.getLogger(
    "opentelemetry.exporter.otlp.proto.http.trace_exporter"
)
otlp_exporter_logger.addHandler(logging.NullHandler())
otlp_exporter_logger.propagate = False
logger = logging.getLogger(__name__)


class Mode(Enum):
    TEXT = "text"
    VOICE = "voice"


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
    # Initialization
    global memory_agent, memory_queue, comm_agent, voice_agent, voice_memory_agent
    memory_agent = MemoryAgent()
    comm_agent = CommunicationAgent()
    memory_queue = asyncio.Queue(maxsize=1000)

    memory_task = asyncio.create_task(memory_processor())

    logger.info(
        f"API Server ready for requests, current processing mode: '{current_mode.name}'"
    )

    yield

    if memory_task and not memory_task.done():
        memory_task.cancel()
        try:
            await memory_task
        except asyncio.CancelledError:
            pass

    # Clean up
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


@app.post("/generate/text")
async def generate_aprompt(request: PromptRequest):
    global current_mode

    if current_mode != Mode.TEXT:
        raise HTTPException(
            status_code=500,
            detail="Switch to text mode first using '/switch?mode='text''",
        )

    prompt_with_tools = f"{request.frontendTools}\n\n{request.prompt}"

    async def generate_chunks():
        full_response = []
        async for chunk in comm_agent.generate(prompt_with_tools):
            full_response.append(chunk)
            yield f"data: {chunk}\n\n"

        memory_queue.put_nowait(request.prompt)

    return StreamingResponse(generate_chunks(), media_type="text/event-stream")


@app.post("/generate/voice")
async def voice_stream(file: UploadFile = File(...)):
    if current_mode != Mode.VOICE:
        raise HTTPException(
            status_code=500,
            detail="Switch to voice mode first using '/switch?mode='voice''",
        )

    filename = Path(f"{uuid.uuid4()}.wav")
    contents = await file.read()
    with open(filename, "wb") as f:
        f.write(contents)

    output = voice_agent.generate(str(filename))
    logger.info(f"Output from model: {output}")

    memory_queue.put_nowait(str(filename))

    return {"response": output}


@app.post("/mode/switch")
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


@app.get("/mode")
def get_mode():
    return {"mode": current_mode.value}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, workers=1)
