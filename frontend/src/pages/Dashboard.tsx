import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";
import ThemeToggle from "../components/ThemeToggle";
import GodModeNav from "../components/GodModeNav";
import { deleteDisasterContext } from "../api/api.ts";

const Dashboard: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const handleChangeDisaster = async () => {
    try {
      await deleteDisasterContext();
      navigate("/begin");
    } catch (error) {
      console.error("Error deleting disaster context:", error);
      alert("An error occurred while changing the disaster.");
    }
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <GodModeNav />
        <div className="chatbot-header-title">ResQTalk</div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <h3 className="dashboard-title">Dashboard</h3>
      <div className="dashboard-container">
        <div className="dashboard-grid">
          <Link to="/maps" className="dashboard-card">
            <h2>Maps</h2>
          </Link>
          <Link to="/chat" className="dashboard-card">
            <h2>Chat</h2>
          </Link>
          <Link to="/checklist" className="dashboard-card">
            <h2>Checklist</h2>
          </Link>
          <Link to="/info" className="dashboard-card">
            <h2>Stored Info</h2>
          </Link>
          <Link to="/alerts" className="dashboard-card">
            <h2>Live Alerts</h2>
          </Link>
          <Link to="/sos" className="dashboard-card">
            <h2>SOS Tools</h2>
          </Link>
          <div onClick={handleChangeDisaster} className="dashboard-card">
            <h2>Change Disaster</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
