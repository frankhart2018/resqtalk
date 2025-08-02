import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/useTheme";
import "./Chatbot.css";
import "./SOSTools.css";

import { playSound } from "../tools/sound-tools";

const SOSTools: React.FC = () => {
  const { theme } = useTheme();
  const [isFlashing, setIsFlashing] = useState(false);

  const handleFlashToggle = () => {
    setIsFlashing((prevState) => !prevState);
  };

  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="SOS Tools" />
      <div className="sos-tools-container">
        <button className="siren-button" onClick={playSound}>
          Play Siren
        </button>
        <button className="flash-button" onClick={handleFlashToggle}>
          {isFlashing ? "Stop Flash" : "Start Flash"}
        </button>
      </div>
      {isFlashing && <div className="flash-overlay" onClick={handleFlashToggle}></div>}
    </div>
  );
};

export default SOSTools;
