import sqlite3
import os

from service.utils.singleton import singleton
from service.utils.constants import MAP_DB_NAME


@singleton
class MapStore:
    def __init__(self):
        if not os.path.exists(MAP_DB_NAME):
            raise ValueError("No offline maps found")

    def get_tile(self, x: int, y: int, z: int):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT data from tiles WHERE z=? AND x=? AND y=?", (z, x, y)
            )
            result = cursor.fetchone()

            return result[0] if result is not None and len(result) >= 1 else None
