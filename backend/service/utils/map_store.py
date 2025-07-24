import sqlite3
import os

from service.utils.singleton import singleton
from service.utils.constants import MAP_DB_NAME


@singleton
class MapStore:
    def __init__(self, create_if_no_exists: bool = False):
        if not os.path.exists(MAP_DB_NAME) and not create_if_no_exists:
            raise ValueError("No offline maps found")

        self.__tile_table = "tiles"

    def get_tile(self, x: int, y: int, z: int):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT data from {self.__tile_table} WHERE z=? AND x=? AND y=?",
                (z, x, y),
            )
            result = cursor.fetchone()

            return result[0] if result is not None and len(result) >= 1 else None

    def get_tile_for_zoom(self, zoom: int) -> set[int, int]:
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT x, y FROM tiles WHERE z=?", (zoom,))
            existing_tiles = set(cursor.fetchall())
            return existing_tiles

    def setup_database(self):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {self.__tile_table} (
                    z INTEGER,
                    x INTEGER,
                    y INTEGER,
                    data BLOB,
                    PRIMARY KEY (z, x, y)
                )
            """
            )

            conn.commit()

    def store_tile(self, x: int, y: int, z: int, tile_data: bytes):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"INSERT OR REPLACE INTO {self.__tile_table} (z, x, y, data) VALUES (?, ?, ?, ?)",
                (z, x, y, tile_data),
            )
            conn.commit()
