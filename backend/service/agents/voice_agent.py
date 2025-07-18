import torch
from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_core.runnables import RunnableConfig
from langgraph.store.redis import RedisStore
from langgraph.store.base import BaseStore
from langfuse.langchain import CallbackHandler

from service.utils.environment import REDIS_HOST
from service.utils.wav_utils import load_audio_from_file
from service.model import HuggingFaceGemma3nClient
from service.prompts import COMMUNICATION_AGENT_PROMPT


class VoiceCommunicationAgent:
    def __init__(self):
        model_obj = HuggingFaceGemma3nClient()
        self.model, self.processor = model_obj.model, model_obj.processor

    def __call_model(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        user_id = config["configurable"]["user_id"]
        namespace = ("memories", user_id)
        memories = store.search(namespace, query=str(state["messages"][-1].content))

        info = "\n".join([str(d.value) for d in memories])

        system_msg = COMMUNICATION_AGENT_PROMPT.format(info=info)

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "audio",
                        "audio": load_audio_from_file(
                            file_path=state["messages"][-1].content
                        ),
                    },
                ],
            },
            {
                "role": "system",
                "content": [{"type": "text", "text": system_msg}],
            },
        ]

        inputs = self.processor.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        ).to(self.model.device, dtype=self.model.dtype)

        with torch.inference_mode():
            out = self.model.generate(
                **inputs, max_new_tokens=256, disable_compile=True
            )

        response = self.processor.decode(
            out[0][inputs["input_ids"].shape[-1] :], skip_special_tokens=True
        )
        return {"messages": response}

    def generate(self, prompt: str):
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
                {"messages": [{"role": "user", "content": prompt}]},
                config,
            )["messages"][-1].content
