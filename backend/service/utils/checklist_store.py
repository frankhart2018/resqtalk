import pymongo

from service.utils.singleton import singleton
from service.utils.environment import MONGO_HOST
from service.utils.constants import MONGO_DB_NAME
from service.data_models.onboarding import Disaster, Phase


MONGO_COLLECTION_NAME = "checklists"


@singleton
class ChecklistStore:
    def __init__(self):
        client = pymongo.MongoClient(host=MONGO_HOST)
        self.__db = client[MONGO_DB_NAME]
        self.__collection = self.__db[MONGO_COLLECTION_NAME]

    def save_checklist(self, disaster_type: str, phase: str, checklist: list[str]):
        document = {
            "disaster_type": disaster_type,
            "phase": phase,
            "checklist": checklist,
        }
        self.__collection.insert_one(document)

    def get_checklist(self, disaster: Disaster, phase: Phase):
        return self.__collection.find_one(
            {"disaster_type": disaster.value, "phase": phase.value}, {"_id": 0}
        )

    def delete_cache(self):
        self.__collection.delete_many({})
