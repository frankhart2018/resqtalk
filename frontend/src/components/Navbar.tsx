import React from "react";
import GodModeNav from "./GodModeNav";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";
import "./Navbar.css";

interface NavbarProps {
  pageTitle: string;
}

const Navbar: React.FC<NavbarProps> = ({ pageTitle }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="chatbot-header">
      <div className="navbar-left">
        <GodModeNav />
      </div>
      <div className="chatbot-header-title">ResQTalk - {pageTitle}</div>
      <div className="navbar-right">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
};

export default Navbar;
