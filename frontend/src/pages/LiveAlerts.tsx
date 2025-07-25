import React, { useEffect, useState } from "react";
import { getActiveAlerts } from "../api/api";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/ThemeContext";
import "./LiveAlerts.css";
import "../App.css"; // For chatbot class

const LiveAlerts: React.FC = () => {
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlertsWithLocation = async (
      latitude: number,
      longitude: number
    ) => {
      try {
        const response = await getActiveAlerts(latitude, longitude);
        setAlerts(response.activeAlerts);
      } catch (err) {
        setError("Failed to fetch alerts.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchAlertsWithLocation(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (err) => {
          setError(
            `Geolocation error: ${err.message}. Cannot fetch alerts without location.`
          );
          setLoading(false);
          console.error(err);
        }
      );
    } else {
      setError(
        "Geolocation is not supported by your browser. Cannot fetch alerts without location."
      );
      setLoading(false);
    }
  }, []);

  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Live Alerts" />
      <div className="dashboard-container">
        <div className="live-alerts-content">
          {loading ? (
            <p>Loading alerts...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : alerts.length > 0 ? (
            <ul>
              {alerts.map((alert, index) => (
                <li key={index}>{alert}</li>
              ))}
            </ul>
          ) : (
            <p>No active alerts at this time.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAlerts;
