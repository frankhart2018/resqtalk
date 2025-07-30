from pydantic import BaseModel

from service.data_models.onboarding import Disaster


class ChecklistAgentRequest(BaseModel):
    disaster: Disaster
    phase: str
