import React from "react";

const RobotIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="4" width="12" height="16" rx="2" ry="2" />
    <circle cx="12" cy="2" r="1" />
    <line x1="12" y1="3" x2="12" y2="4" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="9" r="1" />
    <rect x="9" y="12" width="6" height="2" rx="1" />
    <line x1="6" y1="16" x2="4" y2="18" />
    <line x1="18" y1="16" x2="20" y2="18" />
  </svg>
);

export default RobotIcon;
