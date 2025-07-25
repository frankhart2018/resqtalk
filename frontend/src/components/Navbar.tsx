import React from "react";
import GodModeNav from "./GodModeNav";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../contexts/useTheme";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

interface NavbarProps {
  pageTitle: string;
}

const Navbar: React.FC<NavbarProps> = ({ pageTitle }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="chatbot-header">
      <div className="navbar-left">
        <GodModeNav />
      </div>
      <div className="chatbot-header-title" onClick={() => navigate('/')}>ResQTalk - {pageTitle}</div>
      <div className="navbar-right">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
};

export default Navbar;
