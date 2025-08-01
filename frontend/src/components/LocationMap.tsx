import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationMapProps {
  latitude: string;
  longitude: string;
  useOnline: boolean;
  height?: string;
}

const ONLINE_OSM_TILE_SERVER = "https://tile.openstreetmap.org";
const OSM_TILE_SERVER =
  import.meta.env.VITE_OSM_SERVER || ONLINE_OSM_TILE_SERVER;
const TILE_SERVER_TEMPLATIZED_URL = `${OSM_TILE_SERVER}/{z}/{x}/{y}.png`;
const ONLINE_SERVER_TEMPLATIZED_URL = `${ONLINE_OSM_TILE_SERVER}/{z}/{x}/{y}.png`;

const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  useOnline,
  height = "300px",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(
        [parseFloat(latitude), parseFloat(longitude)],
        13
      );

      L.tileLayer(
        useOnline ? ONLINE_SERVER_TEMPLATIZED_URL : TILE_SERVER_TEMPLATIZED_URL,
        {
          attribution: "&copy; OpenStreetMap contributors",
          minZoom: 13,
          maxZoom: 19,
        }
      ).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView(
        [parseFloat(latitude), parseFloat(longitude)],
        mapInstance.current.getZoom()
      );
    }

    if (markerInstance.current) {
      markerInstance.current.setLatLng([
        parseFloat(latitude),
        parseFloat(longitude),
      ]);
    } else {
      markerInstance.current = L.marker([
        parseFloat(latitude),
        parseFloat(longitude),
      ]).addTo(mapInstance.current);
    }

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/marker-icon-2x.png",
      iconUrl: "/marker-icon.png",
      shadowUrl: "/marker-shadow.png",
    });
  }, [latitude, longitude, useOnline]);

  return (
    <div id="map" ref={mapRef} style={{ height, width: "100%" }}></div>
  );
};

export default LocationMap;
