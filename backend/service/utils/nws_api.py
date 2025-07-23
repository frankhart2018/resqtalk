import requests

from service.utils.singleton import singleton


BASE_URL = "https://api.weather.gov"


@singleton
class NWSApiFacade:
    def __init__(self, latitude: float, longitude: float):
        self.__lat = latitude
        self.__lon = longitude

        self.__forecast_zone = self.__get_forecast_zone()

    def __get_forecast_zone(self):
        res = requests.get(f"{BASE_URL}/points/{self.__lat:.4f},{self.__lon:.4f}")
        res.raise_for_status()

        forecast_zone_url = res.json().get("properties", {}).get("forecastZone", None)
        if forecast_zone_url is None:
            raise ValueError(f"Failed to call National Weather Service, retry later!")

        return forecast_zone_url.split("/")[-1]

    def get_active_alerts(self):
        res = requests.get(f"{BASE_URL}/alerts/active/zone/{self.__forecast_zone}")
        res.raise_for_status()

        active_alerts = map(
            lambda feature: feature.get("properties", {}).get("headline", ""),
            res.json().get("features", []),
        )

        return [headline for headline in active_alerts if len(headline.strip()) > 0]
