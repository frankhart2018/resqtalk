import React, { useState, useEffect } from 'react';
import ThemeToggle from "../components/ThemeToggle";
import BackIcon from "../components/BackIcon";
import { useNavigate } from "react-router-dom";
import { getCurrentPrivileges, getSystemPrompt, setSystemPrompt } from "../api/api";
import type { GetCurrentPrivilegesResponse, GetSystempPromptResponse } from "../api/model";
import "./Chatbot.css";
import "./GodMode.css";

const GodMode: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const [isGodMode, setIsGodMode] = useState(false);
  const [communicationAgentPrompt, setCommunicationAgentPrompt] = useState("");
  const [memoryAgentPrompt, setMemoryAgentPrompt] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentPrivileges().then((data: GetCurrentPrivilegesResponse) => {
      setIsGodMode(data.isGodMode);
      if (!data.isGodMode) {
        navigate("/");
      }
    });

    getSystemPrompt("communication-agent-sys-prompt").then((data: GetSystempPromptResponse) => {
      setCommunicationAgentPrompt(data.prompt);
    });

    getSystemPrompt("memory-agent-sys-prompt").then((data: GetSystempPromptResponse) => {
      setMemoryAgentPrompt(data.prompt);
    });
  }, [navigate]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const handleSave = async (key: string, prompt: string) => {
    await setSystemPrompt(key, prompt);
    window.location.reload();
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
        <div className="god-mode-content">
          <div className="prompt-box">
            <label htmlFor="communication-agent-prompt">Communication Agent System Prompt</label>
            <textarea
              id="communication-agent-prompt"
              value={communicationAgentPrompt}
              onChange={(e) => setCommunicationAgentPrompt(e.target.value)}
              rows={10}
            />
            <button className="chatbot-button" onClick={() => handleSave("communication-agent-sys-prompt", communicationAgentPrompt)}>Save</button>
          </div>
          <div className="prompt-box">
            <label htmlFor="memory-agent-prompt">Memory Agent System Prompt</label>
            <textarea
              id="memory-agent-prompt"
              value={memoryAgentPrompt}
              onChange={(e) => setMemoryAgentPrompt(e.target.value)}
              rows={10}
            />
            <button className="chatbot-button" onClick={() => handleSave("memory-agent-sys-prompt", memoryAgentPrompt)}>Save</button>
          </div>
        </div>
      </div>
    ) : null
  );
};

export default GodMode;
