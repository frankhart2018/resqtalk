import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/useTheme";
import { deleteDisasterContext } from "../api/api.ts";

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

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
      <Navbar pageTitle="Dashboard" />
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
