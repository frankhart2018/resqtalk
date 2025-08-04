import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDisasters,
  getDisasterContext,
  setDisasterContext,
} from "../api/api";
import type { GetDisastersResponse } from "../api/model";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/useTheme";
import "./Agent.css"; // For theme
import "./Begin.css";

const Begin: React.FC = () => {
  const { theme } = useTheme();
  const [disasters, setDisasters] = useState<string[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  const [disasterPhase, setDisasterPhase] = useState<string>("pre-disaster"); // Default to pre-disaster
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkDisasterContext = async () => {
      try {
        const disasterContext = await getDisasterContext();
        if (disasterContext) {
          navigate("/dashboard");
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // If disaster context is not found, we can assume it's not set.
        // The error is expected in this case, so we can ignore it.
      }
    };

    checkDisasterContext();

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

  const handleSubmit = async () => {
    if (selectedDisaster && disasterPhase) {
      try {
        await setDisasterContext({
          disaster: selectedDisaster,
          phase: disasterPhase,
        });
        localStorage.setItem("selectedDisaster", selectedDisaster);
        localStorage.setItem("disasterPhase", disasterPhase);
        navigate("/dashboard");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        alert("An error occurred while setting the disaster context.");
      }
    }
  };

  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Begin" />
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
                  className={`disaster-button ${
                    selectedDisaster === disaster ? "selected" : ""
                  }`}
                  onClick={() => setSelectedDisaster(disaster)}
                >
                  {disaster.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              className="submit-button"
              disabled={!selectedDisaster || !disasterPhase}
              onClick={handleSubmit}
            >
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Begin;
