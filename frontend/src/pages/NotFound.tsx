import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/ThemeContext";
import "./NotFound.css"; // We'll create this CSS file next

const NotFound: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Not Found" />
      <div className="not-found-container">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="not-found-link">
          Go to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
