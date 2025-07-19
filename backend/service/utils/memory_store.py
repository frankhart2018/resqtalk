import redis

from service.utils.singleton import singleton
from service.utils.environment import REDIS_HOST


@singleton
class MemoryStore:
    def __init__(self):
        redis_host, redis_port = REDIS_HOST.split("redis://")[1].split(":")
        self.__client = redis.Redis(
            host=redis_host.strip(), port=int(redis_port.strip())
        )

    def list_memory(self):
        # store:* is the key format for memory store
        # All other keys are langfuse keys
        return list(
            map(
                lambda key: self.__client.json().get(key, "$.value"),
                list(self.__client.scan_iter("store:*")),
            )
        )
