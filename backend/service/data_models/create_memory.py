from pydantic import BaseModel


class CreateMemoryRequest(BaseModel):
    message: str
