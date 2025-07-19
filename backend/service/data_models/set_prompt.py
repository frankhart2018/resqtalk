from pydantic import BaseModel


class SetPromptRequest(BaseModel):
    key: str
    prompt: str
