import os


OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MONGO_HOST = os.getenv("MONGO_HOST", "mongodb://localhost:27017/")
REDIS_HOST = os.getenv("REDIS_HOST", "redis://localhost:6379")
