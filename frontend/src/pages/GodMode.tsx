import React, { useState, useEffect } from 'react';
import ThemeToggle from "../components/ThemeToggle";
import BackIcon from "../components/BackIcon";
import { useNavigate } from "react-router-dom";
import { getCurrentPrivileges } from "../api/api";
import type { GetCurrentPrivilegesResponse } from "../api/model";
import "./Chatbot.css";

const GodMode: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const [isGodMode, setIsGodMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentPrivileges().then((data: GetCurrentPrivilegesResponse) => {
      setIsGodMode(data.isGodMode);
      if (!data.isGodMode) {
        navigate("/");
      }
    });
  }, [navigate]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    isGodMode ? (
      <div className={`chatbot ${theme}`}>
        <div className="chatbot-header">
          <span onClick={() => navigate("/")}>
            <BackIcon />
          </span>
          <div className="chatbot-header-title">ResQTalk</div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
        <h1>Apun hi bhagwan</h1>
      </div>
    ) : null
  );
};

export default GodMode;