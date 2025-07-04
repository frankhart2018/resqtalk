import uuid
from service.utils.singleton import singleton
import pymongo
from service.utils.environment import MONGO_HOST


@singleton
class PromptsStore:
    def __init__(self):
        self.client = pymongo.MongoClient(MONGO_HOST)
        self.db = self.client["resqtalk_db"]
        self.collection = self.db["prompts"]

    def store_prompt_and_result(self, prompt: str, response: str) -> str:
        prompt_id = str(uuid.uuid4())
        self.collection.insert_one(
            {"promptId": prompt_id, "prompt": prompt, "response": response}
        )
        return prompt_id
