import os


OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MONGO_HOST = os.getenv("MONGO_HOST", "mongodb://localhost:27017/")
REDIS_HOST = os.getenv("REDIS_HOST", "redis://localhost:6379")
LANGFUSE_URL = os.getenv("LANGFUSE_URL", "http://localhost:3000")

LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", None)
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY", None)

MAP_TILE_SERVER = os.getenv("MAP_TILE_SERVER", "https://tile.openstreetmap.org")
