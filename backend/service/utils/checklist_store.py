import pymongo

from service.utils.singleton import singleton
from service.utils.environment import MONGO_HOST
from service.utils.constants import MONGO_DB_NAME
from typing import List

MONGO_COLLECTION_NAME = "checklists"


@singleton
class ChecklistStore:
    def __init__(self):
        client = pymongo.MongoClient(host=MONGO_HOST)
        self.__db = client[MONGO_DB_NAME]
        self.__collection = self.__db[MONGO_COLLECTION_NAME]

    def save_checklist(self, disaster_type: str, phase: str, checklist: List[str]):
        document = {
            "disaster_type": disaster_type,
            "phase": phase,
            "checklist": checklist,
        }
        self.__collection.insert_one(document)

    def get_checklists(self):
        return self.__collection.find({})

    def delete_cache(self):
        self.__collection.delete_many({})
