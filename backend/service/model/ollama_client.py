from langchain_ollama import ChatOllama
import logging

from service.utils.singleton import singleton
from service.utils.environment import OLLAMA_HOST


logger = logging.getLogger(__name__)


@singleton
class LangchainOllamaGemmaClient:
    MODEL_ID = "gemma3n:latest"

    def __init__(self):
        self.model = ChatOllama(model=self.MODEL_ID, base_url=OLLAMA_HOST)
        logger.info("Loaded langchain ollama Gemma3n model.")
