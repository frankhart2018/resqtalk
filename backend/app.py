from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from service.model.llm import GemmaLLMClient
from service.utils.prompts_store import PromptsStore


llm_client: Optional[GemmaLLMClient] = None
prompts_store: Optional[PromptsStore] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    global llm_client, prompts_store
    llm_client = GemmaLLMClient()
    prompts_store = PromptsStore()
    yield
    # Clean up the ML models and release the resources
    llm_client = None
    prompts_store = None


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PromptRequest(BaseModel):
    prompt: str


class ToolCallResultRequest(BaseModel):
    result: str


@app.post("/prompt")
async def generate_prompt(request: PromptRequest):
    response = llm_client.generate(request.prompt)
    prompt_id = prompts_store.store_prompt_and_result(
        prompt=request.prompt, response=response
    )
    return {"response": response, "promptId": prompt_id}


@app.patch("/tool-call/{promptId}")
async def update_tool_call(promptId: str, request: ToolCallResultRequest):
    prompts_store.update_tool_call_result(prompt_id=promptId, tool_call_result=request.result)
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
