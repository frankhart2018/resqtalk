from transformers import AutoProcessor, Gemma3nForConditionalGeneration
import torch
import logging

from service.utils.singleton import singleton


logger = logging.getLogger(__name__)


@singleton
class HuggingFaceGemma3nClient:
    MODEL_ID = "google/gemma-3n-E4B-it"

    def __init__(self):
        self.model = Gemma3nForConditionalGeneration.from_pretrained(
            self.MODEL_ID,
            device_map="auto",
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
        )
        self.processor = AutoProcessor.from_pretrained(self.MODEL_ID)
        logging.info("Loaded HuggingFace Gemma3n model.")
