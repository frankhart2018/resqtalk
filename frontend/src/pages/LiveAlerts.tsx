import React, { useEffect, useState } from "react";
import { getActiveAlerts } from "../api/api";
import ThemeToggle from "../components/ThemeToggle";
import GodModeNav from "../components/GodModeNav";
import "./LiveAlerts.css";
import "../App.css"; // For chatbot class

const LiveAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState("dark"); // Assuming a default theme

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

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
      <div className="chatbot-header">
        <GodModeNav />
        <div className="chatbot-header-title">ResQTalk</div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <h3 className="dashboard-title">Live Alerts</h3>
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
