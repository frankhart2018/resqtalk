import math
import aiohttp
import logging
import asyncio

from service.utils.map_store import MapStore
from service.utils.environment import MAP_TILE_SERVER


logger = logging.getLogger(__name__)


class MapDownloader:
    def __init__(self):
        self.__map_store = MapStore(create_if_no_exists=True)

        self.__tile_server = MAP_TILE_SERVER

        self.__consecutive_errors = 0
        self.__max_consecutive_errors = 20

    def __deg2num(self, lat_deg: float, lon_deg: float, zoom: int) -> tuple[int, int]:
        lat_radians = math.radians(lat_deg)
        n = 2.0**zoom
        x = int((lon_deg + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_radians)) / math.pi) / 2.0 * n)
        return (x, y)

    def __calculate_bounds(
        self, center_lat: float, center_lon: float, radius_miles: float, zoom: int
    ) -> tuple[int, int, int, int]:
        # 1 degree lat = 69.0 miles
        lat_offset = radius_miles / 69.0
        lon_offset = radius_miles / (69.0 * math.cos(math.radians(center_lat)))

        north = center_lat + lat_offset
        south = center_lat - lat_offset
        east = center_lon + lon_offset
        west = center_lon - lon_offset

        x_min, y_min = self.__deg2num(north, west, zoom)
        x_max, y_max = self.__deg2num(south, east, zoom)

        return (x_min, y_min, x_max, y_max)

    async def __download_tile(
        self, session: aiohttp.ClientSession, z: int, x: int, y: int
    ) -> bool:
        url = f"{self.__tile_server}/{z}/{x}/{y}.png"

        try:
            async with session.get(url) as response:
                if response.status == 200:
                    tile_data = await response.read()
                    self.__map_store.store_tile(x, y, z, tile_data)
                    self.__consecutive_errors = 0
                    return True
                else:
                    logger.error(
                        f"Failed to download tile {z}/{x}/{y}: {response.status}"
                    )
                    return False
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            logger.error(f"Network error downloading tile {z}/{x}/{y}: {e}")
            self.__consecutive_errors += 1
        except Exception as e:
            logger.error(f"Failed to download tile {z}/{x}/{y}: {response.status}")
            return False

    async def __gather_tasks(self, tasks: list[bool]) -> int:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        batch_processed = sum(int(r) for r in results)
        return batch_processed

    async def download_area(
        self,
        center_lat: float,
        center_lon: float,
        radius_miles: float,
        min_zoom: int,
        max_zoom: int,
    ) -> bool:
        total_tiles = 0
        processed_tiles = 0
        tile_info_per_zoom_level = {}

        self.__map_store.update_lat_lon(center_lat, center_lon)

        for zoom in range(min_zoom, max_zoom + 1):
            x_min, y_min, x_max, y_max = self.__calculate_bounds(
                center_lat, center_lon, radius_miles, zoom
            )
            this_zoom_tile_count = (x_max - x_min + 1) * (y_max - y_min + 1)
            tile_info_per_zoom_level[zoom] = (
                (x_min, y_min),
                (x_max, y_max),
                this_zoom_tile_count,
            )
            total_tiles += this_zoom_tile_count

        logger.info(
            f"Processing {total_tiles} tiles for {radius_miles}-mile radius around ({center_lat}, {center_lon})"
        )
        logger.info(f"Zoom levels: {min_zoom} to {max_zoom}")

        headers = {"User-Agent": "OfflineMapDownloader/1.0"}
        connector = aiohttp.TCPConnector(limit=500)
        timeout = aiohttp.ClientTimeout(total=60)

        try:
            async with aiohttp.ClientSession(
                headers=headers, connector=connector, timeout=timeout
            ) as session:
                for zoom in range(min_zoom, max_zoom + 1):
                    (x_min, y_min), (x_max, y_max), this_zoom_count = (
                        tile_info_per_zoom_level[zoom]
                    )
                    logger.info(
                        f"Processing zoom level {zoom}: {this_zoom_count} tiles"
                    )
                    logger.info(f"Checking existing tiles for zoom {zoom}")
                    existing_tiles = self.__map_store.get_tile_for_zoom(zoom)
                    logger.info(
                        f"Found {len(existing_tiles)} existing tiles for zoom {zoom}"
                    )

                    tasks = []
                    for x in range(x_min, x_max + 1):
                        for y in range(y_min, y_max + 1):
                            if (x, y) in existing_tiles:
                                processed_tiles += 1
                                continue

                            tasks.append(self.__download_tile(session, zoom, x, y))

                            if len(tasks) >= 500:
                                processed_tiles += await self.__gather_tasks(tasks)

                                tasks = []

                                await asyncio.sleep(0.5)

                                if (
                                    self.__consecutive_errors
                                    > self.__max_consecutive_errors
                                ):
                                    raise aiohttp.ClientError(
                                        "Too many consecutive errors, try later!"
                                    )

                                logger.info(
                                    f"Progress: {processed_tiles}/{total_tiles} ({processed_tiles/total_tiles*100:.1f}%)"
                                )

                    if tasks:
                        processed_tiles += await self.__gather_tasks(tasks)

                    logger.info(f"Completed zoom level {zoom}")

            self.__map_store.mark_download_complete()

            return True
        except aiohttp.ClientError as e:
            logger.error(e)
            return False
        except Exception as e:
            logger.error(e)
            # If not network error, then it's irrecoverable or retryable
            return True
