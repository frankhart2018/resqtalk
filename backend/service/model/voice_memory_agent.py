import torch
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.store.redis import RedisStore
from langgraph.store.base import BaseStore
from langchain_core.runnables import RunnableConfig
import json
import uuid
import logging
from pathlib import Path

from service.utils.environment import REDIS_HOST
from service.utils.wav_utils import load_audio_from_file
from service.model.hf_client import HuggingFaceGemma3nClient


logger = logging.getLogger(__name__)


class VoiceMemoryAgent:
    def __init__(self):
        model_obj = HuggingFaceGemma3nClient()
        self.model, self.processor = model_obj.model, model_obj.processor

    def __store_memory(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        system_msg = """Extract important information from the user's message that should be remembered.

Look for any factual information, preferences, names, or details that would be useful to remember in future conversations.

Here are examples of what to extract:

Input: "Hi! Remember: my name is Bob"
Output: {"name": "Bob"}

Input: "My favorite color is blue"
Output: {"favorite_color": "blue"}

Input: "I work at Google as a software engineer"
Output: {"employer": "Google", "job": "software engineer"}

Input: "The server IP is 192.168.1.100"
Output: {"server_ip": "192.168.1.100"}

Input: "What's the weather like?"
Output: {}

Input: "How are you?"
Output: {}

Now extract information from this message. Return only valid JSON with no extra text:"""

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

    def __get_memory_to_store(
        self, state: MessagesState, config: RunnableConfig, *, store: BaseStore
    ):
        try:
            memory_content = state["messages"][-1].content

            if not memory_content or memory_content.strip() == "":
                logging.error("Empty memory content received")
                return

            cleaned_content = memory_content.strip()

            if cleaned_content.startswith("Output:"):
                cleaned_content = cleaned_content.replace("Output:", "").strip()

            # Handle JSON wrapped in markdown code blocks
            if "```json" in cleaned_content:
                start = cleaned_content.find("```json") + 7
                end = cleaned_content.find("```", start)
                if end != -1:
                    cleaned_content = cleaned_content[start:end].strip()
            elif "```" in cleaned_content:
                start = cleaned_content.find("```") + 3
                end = cleaned_content.find("```", start)
                if end != -1:
                    cleaned_content = cleaned_content[start:end].strip()

            store_memory_msg = json.loads(cleaned_content)

            if store_memory_msg:
                user_id = config["configurable"]["user_id"]
                namespace = ("memories", user_id)
                store.put(namespace, str(uuid.uuid4()), store_memory_msg)
                logging.info(f"Successfully added new memory: {store_memory_msg}")
            else:
                logging.info("No memory to store (empty JSON)")
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse JSON: {e}")
            logging.error(f"Raw content was: '{memory_content}'")
        except Exception as e:
            logging.error(f"Failed to store memory: {e}")

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

            graph = builder.compile(store=store)

            config = {"configurable": {"thread_id": "1", "user_id": "1"}}
            graph.invoke(
                {"messages": [{"role": "user", "content": user_message}]}, config
            )

        file = Path(user_message)
        file.unlink()
