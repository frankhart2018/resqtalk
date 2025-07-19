from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.store.redis import RedisStore
from langgraph.store.base import BaseStore
from langchain_core.runnables import RunnableConfig
from langfuse.langchain import CallbackHandler
import uuid
import logging

from service.utils.environment import REDIS_HOST
from service.utils.constants import MEMORY_AGENT_SYS_PROMPT_KEY
from service.utils.prompt_store import SystemPromptStore
from service.utils.parsing_utils import extract_memory_json
from service.model import LangchainOllamaGemmaClient


logger = logging.getLogger(__name__)


class MemoryAgent:
    def __init__(self):
        model_obj = LangchainOllamaGemmaClient()
        self.model = model_obj.model

    def __store_memory(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        response = self.model.invoke(
            [
                {
                    "role": "system",
                    "content": SystemPromptStore().get_prompt(
                        key=MEMORY_AGENT_SYS_PROMPT_KEY
                    ),
                },
            ]
            + state["messages"]
        )
        return {"messages": response}

    def __get_memory_to_store(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        try:
            memory_content = state["messages"][-1].content
            store_memory_msg = extract_memory_json(memory_content)

            if store_memory_msg:
                user_id = config["configurable"]["user_id"]
                namespace = ("memories", user_id)
                store.put(namespace, str(uuid.uuid4()), store_memory_msg)
                logger.info(f"Successfully added new memory: {store_memory_msg}")
            else:
                logger.info("No memory to store (empty JSON)")
        except Exception as e:
            logger.error(f"Failed to store memory: {e}")

    async def store_memory(self, user_message: str):
        logger.info(f"Starting to add memory for user message: '{user_message}'")
        with RedisStore.from_conn_string(REDIS_HOST) as store:
            store.setup()

            builder = StateGraph(MessagesState)
            builder.add_node("store_memory", self.__store_memory)
            builder.add_node("get_memory_to_store", self.__get_memory_to_store)

            builder.add_edge(START, "store_memory")
            builder.add_edge("store_memory", "get_memory_to_store")
            builder.add_edge("get_memory_to_store", END)

            langfuse_handler = CallbackHandler()

            graph = builder.compile(store=store)

            config = {
                "configurable": {"thread_id": "1", "user_id": "1"},
                "callbacks": [langfuse_handler],
            }
            graph.invoke(
                {"messages": [{"role": "user", "content": user_message}]}, config
            )
