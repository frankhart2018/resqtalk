from pydantic import BaseModel

class DisasterContextRequest(BaseModel):
    disaster: str
    phase: str
