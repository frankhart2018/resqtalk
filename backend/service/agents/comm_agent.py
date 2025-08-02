from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_core.runnables import RunnableConfig
from langfuse.langchain import CallbackHandler
import sys
import json

from service.utils.constants import COMM_AGENT_SYS_PROMPT_KEY
from service.utils.prompt_store import SystemPromptStore
from service.utils.user_info_store import UserInfoStore
from service.utils.memory_store import MemoryStore
from service.model import LangchainOllamaGemmaClient


class CommunicationAgent:
    def __init__(self):
        model_obj = LangchainOllamaGemmaClient()
        self.model = model_obj.model

    async def __call_model(
        self,
        state: MessagesState,
        config: RunnableConfig,
    ):
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
        system_msg = f"{SystemPromptStore().get_prompt(key=COMM_AGENT_SYS_PROMPT_KEY)}\n{memory_attachment}"
        response = await self.model.ainvoke(
            [{"role": "system", "content": system_msg}] + state["messages"], config
        )
        return {"messages": response}

    async def generate(self, prompt: str):
        builder = StateGraph(MessagesState)
        builder.add_node("call_model", self.__call_model)

        builder.add_edge(START, "call_model")
        builder.add_edge("call_model", END)

        langfuse_handler = CallbackHandler()

        graph = builder.compile()

        config = {
            "configurable": {"thread_id": "1", "user_id": "1"},
            "callbacks": [langfuse_handler],
        }

        async for msg, _ in graph.astream(
            {"messages": [{"role": "user", "content": prompt}]},
            config,
            stream_mode="messages",
        ):
            if msg.content:
                sys.stdout.flush()
                yield msg.content
