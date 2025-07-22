import React, { useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import GodModeNav from "../components/GodModeNav";
import "./Chatbot.css"; 
import "./SOSTools.css"; 

import { playSound, stopSound } from "../tools/sound-tools";

const SOSTools: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const handleSirenToggle = () => {
    setIsSirenPlaying((prevState) => {
      if (!prevState) {
        playSound();
      } else {
        stopSound();
      }
      return !prevState;
    });
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <GodModeNav />
        <div className="chatbot-header-title">ResQTalk</div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <div className="sos-tools-container">
        <h3 className="sos-tools-title">SOS Tools</h3>
        <button className="siren-button" onClick={handleSirenToggle}>
          {isSirenPlaying ? "Stop Siren" : "Play Siren"}
        </button>
      </div>
    </div>
  );
};

export default SOSTools;
