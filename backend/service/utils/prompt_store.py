import pymongo

from service.utils.singleton import singleton
from service.utils.environment import MONGO_HOST, LOAD_PROMPTS_FROM_DB
from service.utils.constants import (
    MONGO_DB_NAME,
    COMM_AGENT_SYS_PROMPT_KEY,
    MEMORY_AGENT_SYS_PROMPT_KEY,
    CHECKLIST_AGENT_SYS_PROMPT_KEY,
    CHECKLIST_AGENT_FORCE_CHECKLIST_SYS_PROMPT_KEY,
)
from service.prompts.communication_agent_prompts import (
    COMMUNICATION_AGENT_SYS_PROMPT,
)
from service.prompts.memory_agent_prompts import MEMORY_AGENT_SYS_PROMPT
from service.prompts.checklist_agent_prompts import (
    CHECKLIST_AGENT_SYS_PROMPT,
    CHECKLIST_AGENT_FORCE_CHECKLIST_SYS_PROMPT,
)


MONGO_COLLECTION_NAME = "system-prompts"


@singleton
class SystemPromptStore:
    def __init__(self):
        if LOAD_PROMPTS_FROM_DB:
            client = pymongo.MongoClient(host=MONGO_HOST)
            self.__db = client[MONGO_DB_NAME]
            self.__collection = self.__db[MONGO_COLLECTION_NAME]
        else:
            self.__prompts = {
                COMM_AGENT_SYS_PROMPT_KEY: COMMUNICATION_AGENT_SYS_PROMPT,
                MEMORY_AGENT_SYS_PROMPT_KEY: MEMORY_AGENT_SYS_PROMPT,
                CHECKLIST_AGENT_SYS_PROMPT_KEY: CHECKLIST_AGENT_SYS_PROMPT,
                CHECKLIST_AGENT_FORCE_CHECKLIST_SYS_PROMPT_KEY: CHECKLIST_AGENT_FORCE_CHECKLIST_SYS_PROMPT,
            }

    def store_prompt(self, key: str, prompt: str):
        if LOAD_PROMPTS_FROM_DB:
            self.__collection.update_one(
                {"key": key}, {"$set": {"prompt": prompt}}, upsert=True
            )
        else:
            self.__prompts[key] = prompt

    def get_prompt(self, key: str):
        if LOAD_PROMPTS_FROM_DB:
            result = self.__collection.find_one({"key": key})
            if result:
                return result.get("prompt")
            return ""
        else:
            return self.__prompts.get(key, "")
