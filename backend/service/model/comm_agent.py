from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_core.runnables import RunnableConfig
from langgraph.store.redis import RedisStore
from langgraph.store.base import BaseStore
import sys

from service.utils.environment import REDIS_HOST
from service.model.ollama_client import LangchainOllamaGemmaClient


class CommunicationAgent:
    def __init__(self):
        model_obj = LangchainOllamaGemmaClient()
        self.model = model_obj.model

    async def __call_model(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        user_id = config["configurable"]["user_id"]
        namespace = ("memories", user_id)
        memories = store.search(namespace, query=str(state["messages"][-1].content))

        info = "\n".join([str(d.value) for d in memories])

        system_msg = f"""You are a helpful assistant who is an expert in disaster management. 
            Here are some details about the user you are talking to: {info}"""
        response = await self.model.ainvoke(
            [{"role": "system", "content": system_msg}] + state["messages"], config
        )
        return {"messages": response}

    async def generate(self, prompt: str):
        with RedisStore.from_conn_string(REDIS_HOST) as store:
            store.setup()

            builder = StateGraph(MessagesState)
            builder.add_node("call_model", self.__call_model)

            builder.add_edge(START, "call_model")
            builder.add_edge("call_model", END)

            graph = builder.compile(store=store)

            config = {"configurable": {"thread_id": "1", "user_id": "1"}}

            async for msg, _ in graph.astream(
                {"messages": [{"role": "user", "content": prompt}]},
                config,
                stream_mode="messages",
            ):
                if msg.content:
                    sys.stdout.flush()
                    yield msg.content
