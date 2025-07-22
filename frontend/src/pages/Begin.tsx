import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDisasters } from "../api/api";
import type { GetDisastersResponse } from "../api/model";
import ThemeToggle from "../components/ThemeToggle";
import "./Chatbot.css"; // For theme
import "./Begin.css";

const Begin: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const [disasters, setDisasters] = useState<string[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  const [disasterPhase, setDisasterPhase] = useState<string>("pre-disaster"); // Default to pre-disaster
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDisasters()
      .then((data: GetDisastersResponse) => {
        setDisasters(data.disasters);
      })
      .catch((error) => {
        console.error("Error fetching disasters:", error);
        if (error.message.includes("404")) {
          navigate("/onboarding");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [navigate]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <div className="chatbot-header-title">ResQTalk</div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <h3 className="begin-heading">Need help? Let's begin.</h3>
      <div className="begin-content">
        {isLoading ? (
          <div>Loading disasters...</div>
        ) : (
          <>
            <div className="disaster-phase-selector">
              <label htmlFor="disaster-phase">Select Phase:</label>
              <select
                id="disaster-phase"
                value={disasterPhase}
                onChange={(e) => setDisasterPhase(e.target.value)}
              >
                <option value="pre-disaster">Pre Disaster</option>
                <option value="post-disaster">Post Disaster</option>
              </select>
            </div>
            <div className="disaster-buttons-container">
            {disasters.map((disaster) => (
              <button
                key={disaster}
                className={`disaster-button ${selectedDisaster === disaster ? "selected" : ""}`}
                onClick={() => setSelectedDisaster(disaster)}
              >
                {disaster.toUpperCase()}
              </button>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Begin;
