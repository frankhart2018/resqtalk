from transformers import AutoProcessor, Gemma3nForConditionalGeneration
import torch
from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_core.runnables import RunnableConfig
from langgraph.store.redis import RedisStore
from langgraph.store.base import BaseStore

from service.utils.environment import REDIS_HOST
from service.utils.wav_utils import load_audio_from_file


class VoiceCommunicationAgent:
    MODEL_ID = "google/gemma-3n-E4B-it"

    def __init__(self):
        self.model = Gemma3nForConditionalGeneration.from_pretrained(
            self.MODEL_ID,
            device_map="auto",
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
        )
        self.processor = AutoProcessor.from_pretrained(self.MODEL_ID)

    def __call_model(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        user_id = config["configurable"]["user_id"]
        namespace = ("memories", user_id)
        memories = store.search(namespace, query=str(state["messages"][-1].content))

        info = "\n".join([str(d.value) for d in memories])

        system_msg = f"""You are a helpful assistant who is an expert in disaster management.
            Here are some details about the user you are talking to: {info}.
            Please give the user an appropriate reply"""

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

            graph = builder.compile(store=store)

            config = {"configurable": {"thread_id": "1", "user_id": "1"}}

            return graph.invoke(
                {"messages": [{"role": "user", "content": prompt}]},
                config,
            )["messages"][-1].content
