from contextlib import asynccontextmanager
import logging
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from service.model.memory_agent import MemoryAgent
from service.model.comm_agent import CommunicationAgent
from service.utils.prompts_store import PromptsStore


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


prompts_store: Optional[PromptsStore] = None
memory_agent: Optional[MemoryAgent] = None
memory_queue: Optional[asyncio.Queue] = None
comm_agent: Optional[CommunicationAgent] = None


async def memory_processor():
    global memory_queue, memory_agent

    while True:
        try:
            user_message = await memory_queue.get()
            asyncio.create_task(memory_agent.store_memory(user_message))
            memory_queue.task_done()
        except asyncio.CancelledError:
            logging.error("Memory processor cancelled")
            break
        except Exception as e:
            logging.error(f"Error in memory processor: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    global prompts_store, memory_agent, memory_queue, comm_agent
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
    response = comm_agent.generate(prompt_with_tools)
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, workers=1)
