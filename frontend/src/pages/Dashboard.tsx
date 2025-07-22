import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import ThemeToggle from '../components/ThemeToggle';
import RobotIcon from '../components/RobotIcon';
import { getCurrentPrivileges } from '../api/api';
import type { GetCurrentPrivilegesResponse } from '../api/model';

const Dashboard: React.FC = () => {
  const [theme, setTheme] = useState('dark');
  const [isGodMode, setIsGodMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentPrivileges().then((data: GetCurrentPrivilegesResponse) => {
      setIsGodMode(data.isGodMode);
    });
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        {isGodMode && (
          <span onClick={() => navigate('/god')}>
            <RobotIcon />
          </span>
        )}
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
          <Link to="/stored-info" className="dashboard-card">
            <h2>Stored Info</h2>
          </Link>
          <Link to="/live-alerts" className="dashboard-card">
            <h2>Live Alerts</h2>
          </Link>
          <Link to="/sos-tools" className="dashboard-card">
            <h2>SOS Tools</h2>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
