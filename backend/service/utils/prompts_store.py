from service.utils.singleton import singleton
import pymongo
from service.utils.environment import MONGO_HOST


@singleton
class PromptsStore:
    def __init__(self):
        self.client = pymongo.MongoClient(MONGO_HOST)
        self.db = self.client["resqtalk_db"]
        self.collection = self.db["prompts"]

    def store_prompt_and_result(self, prompt: str, response: str):
        self.collection.insert_one({"prompt": prompt, "response": response})
