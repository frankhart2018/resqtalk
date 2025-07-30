import React, { useState } from "react";
import GodModeNav from "./GodModeNav";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../contexts/useTheme";
import { useNavigate } from "react-router-dom";
import InfoIcon from "./InfoIcon";
import "./Navbar.css";
import "./InfoButton.css";
import "./InfoBubble.css";

interface NavbarProps {
  pageTitle: string;
}

const Navbar: React.FC<NavbarProps> = ({ pageTitle }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showInfoBubble, setShowInfoBubble] = useState(false);

  const handleInfoClick = () => {
    setShowInfoBubble(!showInfoBubble);
  };

  const selectedDisaster = localStorage.getItem("selectedDisaster") || "Not Set";
  const disasterPhase = localStorage.getItem("disasterPhase") || "Not Set";

  return (
    <div className="chatbot-header">
      <div className="navbar-left">
        <GodModeNav />
      </div>
      <div className="chatbot-header-title" onClick={() => navigate('/')}>ResQTalk - {pageTitle}</div>
      <div className="navbar-right">
        <div style={{ position: 'relative' }}>
          <button className="info-button" onClick={handleInfoClick}>
            <InfoIcon />
          </button>
          {showInfoBubble && (
            <div className="info-bubble">
              <p>Disaster: {selectedDisaster}</p>
              <p>Phase: {disasterPhase}</p>
            </div>
          )}
        </div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
};

export default Navbar;
