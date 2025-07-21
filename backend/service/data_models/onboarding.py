from pydantic import BaseModel
from enum import Enum


class Gender(Enum):
    MALE = "male"
    FEMALE = "female"


class PrimaryMember(BaseModel):
    name: str
    age: int
    gender: Gender
    allergies: list[str]
    medications: list[str]


class DependentMember(PrimaryMember):
    relationship: str


class Location(BaseModel):
    latitude: float
    longitude: float


class Disaster(Enum):
    EARTHQUAKE = "earthquake"
    TORNADO = "tornado"
    FLOOD = "flood"


class OnboardingRequest(BaseModel):
    primaryUserDetails: PrimaryMember
    dependentUserDetails: list[DependentMember]
    location: Location
    selectedDisasters: list[Disaster]


class OnboardingResponse(Enum):
    OK = "ok"
    ALREADY_REGISTERED = "already_registered"
