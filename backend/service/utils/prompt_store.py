import pymongo

from service.utils.singleton import singleton
from service.utils.environment import MONGO_HOST


MONGO_DB_NAME = "resqtalk"
MONGO_COLLECTION_NAME = "system-prompts"


@singleton
class SystemPromptStore:
    def __init__(self):
        client = pymongo.MongoClient(host=MONGO_HOST)
        self.__db = client[MONGO_DB_NAME]
        self.__collection = self.__db[MONGO_COLLECTION_NAME]

    def store_prompt(self, key: str, prompt: str):
        self.__collection.update_one(
            {"key": key}, {"$set": {"prompt": prompt}}, upsert=True
        )

    def get_prompt(self, key: str):
        result = self.__collection.find_one({"key": key})
        if result:
            return result.get("prompt")
        return ""
