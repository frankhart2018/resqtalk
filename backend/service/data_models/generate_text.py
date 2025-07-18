from pydantic import BaseModel


class PromptRequest(BaseModel):
    frontendTools: str
    prompt: str
