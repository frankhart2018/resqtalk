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
        self.__status_table = "status"

        self.__setup_database()
        self.__init_status()

    def __setup_database(self):
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

            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {self.__status_table} (
                    currentStatus INTEGER,
                    lat REAL,
                    lon REAL
                )
            """
            )

            conn.commit()

    def __init_status(self):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {self.__status_table}")
            count = cursor.fetchone()[0]
            if count == 0:
                cursor.execute(
                    f"INSERT OR REPLACE INTO {self.__status_table} (currentStatus, lat, lon) VALUES (?, ?, ?)",
                    (0, 0.0, 0.0),
                )
                conn.commit()

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

    def store_tile(self, x: int, y: int, z: int, tile_data: bytes):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"INSERT OR REPLACE INTO {self.__tile_table} (z, x, y, data) VALUES (?, ?, ?, ?)",
                (z, x, y, tile_data),
            )
            conn.commit()

    def update_lat_lon(self, lat: float, lon: float):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"UPDATE {self.__status_table} SET lat={lat}, lon={lon} WHERE lat=0.0 AND lon=0.0"
            )
            conn.commit()

    def get_cached_lat_lon(self) -> tuple[float, float] | tuple[None, None]:
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {self.__status_table}")
            result = cursor.fetchone()

            return (
                (result[1], result[2])
                if result is not None and len(result) >= 3
                else (None, None)
            )

    def is_download_complete(self) -> bool:
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {self.__status_table}")
            result = cursor.fetchone()
            return result[0] == 1 if result is not None and len(result) >= 1 else False

    def mark_download_complete(self):
        with sqlite3.connect(MAP_DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"UPDATE {self.__status_table} SET currentStatus=1 WHERE currentStatus=0"
            )
            conn.commit()
