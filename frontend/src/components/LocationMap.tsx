import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationMapProps {
  latitude: string;
  longitude: string;
}

const OSM_TILE_SERVER =
  import.meta.env.VITE_OSM_SERVER || "https://tile.openstreetmap.org";
const TILE_SERVER_TEMPLATIZED_URL = `${OSM_TILE_SERVER}/{z}/{x}/{y}.png`;

const LocationMap: React.FC<LocationMapProps> = ({ latitude, longitude }) => {
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

      L.tileLayer(TILE_SERVER_TEMPLATIZED_URL, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance.current);
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
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, [latitude, longitude]);

  return (
    <div id="map" ref={mapRef} style={{ height: "300px", width: "100%" }}></div>
  );
};

export default LocationMap;
