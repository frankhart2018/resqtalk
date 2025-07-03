from ollama import Client

from service.utils.singleton import singleton
from service.utils.environment import OLLAMA_HOST


@singleton
class GemmaLLMClient:
    def __init__(self, host=OLLAMA_HOST):
        self.client = Client(host=host)
        self.model = "gemma3n:latest"

    def generate(self, prompt: str) -> str:
        response = self.client.generate(model=self.model, prompt=prompt)
        return response["response"]
