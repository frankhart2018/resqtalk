from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_core.runnables import RunnableConfig
from langgraph.store.redis import RedisStore
from langgraph.store.base import BaseStore

from service.utils.environment import OLLAMA_HOST, REDIS_HOST


class CommunicationAgent:
    def __init__(self):
        self.model = ChatOllama(model="gemma3n:latest", base_url=OLLAMA_HOST)

    def __call_model(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        user_id = config["configurable"]["user_id"]
        namespace = ("memories", user_id)
        memories = store.search(namespace, query=str(state["messages"][-1].content))

        info = "\n".join([str(d.value) for d in memories])

        system_msg = f"""You are a helpful assistant who is an expert in disaster management. 
            Here are some details about the user you are talking to: {info}"""
        response = self.model.invoke(
            [{"role": "system", "content": system_msg}] + state["messages"]
        )
        return {"messages": response}

    def generate(self, prompt: str):
        with RedisStore.from_conn_string(REDIS_HOST) as store:
            store.setup()

            builder = StateGraph(MessagesState)
            builder.add_node("call_model", self.__call_model)

            builder.add_edge(START, "call_model")
            builder.add_edge("call_model", END)

            graph = builder.compile(store=store)

            config = {"configurable": {"thread_id": "1", "user_id": "1"}}
            response = graph.invoke(
                {"messages": [{"role": "user", "content": prompt}]}, config
            )

            return response["messages"][-1].content
