from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_core.runnables import RunnableConfig
from langgraph.store.base import BaseStore
from langfuse.langchain import CallbackHandler
import json

from service.utils.constants import COMM_AGENT_SYS_PROMPT_KEY
from service.utils.prompt_store import SystemPromptStore
from service.utils.user_info_store import UserInfoStore
from service.utils.memory_store import MemoryStore
from service.agents.voice_agent_base import VoiceAgentBase


class VoiceCommunicationAgent(VoiceAgentBase):
    def __call_model(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        tools = config["configurable"]["tools"]
        audio_path = state["messages"][-1].content

        memories = MemoryStore().list_memory()
        info = []
        for memory in memories:
            for key, val in memory[0].items():
                info.append(f"{key}: {val}")
        info = "\n".join(info)

        user_details = UserInfoStore().get_user_document()
        del user_details["_id"]
        memory_attachment = (
            """
            You are given a compressed information about previous conversation history in chronological order:\n\n{info}.
            And here are the details about the user stored when they onboarded: {stored_user_info}
            """.strip()
        ).format(info=info, stored_user_info=json.dumps(user_details))

        system_prompt = SystemPromptStore().get_prompt(key=COMM_AGENT_SYS_PROMPT_KEY)

        tools_prompt = f"{tools}\n\nUser's voice recording is in the audio file below."

        system_msg = f"{tools_prompt}\n\n{system_prompt}\n{memory_attachment}"

        messages = self.construct_model_messages(
            audio_path=audio_path, system_msg=system_msg
        )

        return {"messages": self.model.invoke(messages)}

    def generate(self, user_voice_file: str, tools: str):
        builder = StateGraph(MessagesState)
        builder.add_node("call_model", self.__call_model)

        builder.add_edge(START, "call_model")
        builder.add_edge("call_model", END)

        langfuse_handler = CallbackHandler()

        graph = builder.compile()

        config = {
            "configurable": {
                "thread_id": "1",
                "user_id": "1",
                "tools": tools,
            },
            "callbacks": [langfuse_handler],
        }

        return graph.invoke(
            {"messages": [{"role": "user", "content": user_voice_file}]},
            config,
        )["messages"][-1].content
