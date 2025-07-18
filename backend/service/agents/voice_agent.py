from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_core.runnables import RunnableConfig
from langgraph.store.redis import RedisStore
from langgraph.store.base import BaseStore
from langfuse.langchain import CallbackHandler

from service.utils.environment import REDIS_HOST
from service.agents.voice_agent_base import VoiceAgentBase
from service.prompts import COMMUNICATION_AGENT_PROMPT


class VoiceCommunicationAgent(VoiceAgentBase):
    def __call_model(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        user_id = config["configurable"]["user_id"]
        namespace = ("memories", user_id)
        memories = store.search(namespace, query=str(state["messages"][-1].content))

        info = "\n".join([str(d.value) for d in memories])

        system_msg = COMMUNICATION_AGENT_PROMPT.format(info=info)
        audio_path = state["messages"][-1].content
        messages = self.construct_model_messages(
            audio_path=audio_path, system_msg=system_msg
        )

        return {"messages": self.model.invoke(messages)}

    def generate(self, user_voice_file: str):
        with RedisStore.from_conn_string(REDIS_HOST) as store:
            store.setup()

            builder = StateGraph(MessagesState)
            builder.add_node("call_model", self.__call_model)

            builder.add_edge(START, "call_model")
            builder.add_edge("call_model", END)

            langfuse_handler = CallbackHandler()

            graph = builder.compile(store=store)

            config = {
                "configurable": {"thread_id": "1", "user_id": "1"},
                "callbacks": [langfuse_handler],
            }

            return graph.invoke(
                {"messages": [{"role": "user", "content": user_voice_file}]},
                config,
            )["messages"][-1].content
