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

    def invoke(self, messages):
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

        return response
