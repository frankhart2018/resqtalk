from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from service.model.llm import GemmaLLMClient


llm_client: Optional[GemmaLLMClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    global llm_client
    llm_client = GemmaLLMClient()
    yield
    # Clean up the ML models and release the resources
    llm_client = None


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


@app.post("/prompt")
async def generate_prompt(request: PromptRequest):
    response = llm_client.generate(request.prompt)
    return {"response": response}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
