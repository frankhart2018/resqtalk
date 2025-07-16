// ModeToggle.tsx
import React from "react";
import MicIcon from "./MicIcon";
import KeyboardIcon from "./KeyboardIcon";
import "./ModeToggle.css";

interface Props {
  mode: string;
  toggleMode: () => void;
}

const ModeToggle: React.FC<Props> = ({ mode, toggleMode }) => (
  <div onClick={toggleMode} className="mode-toggle">
    {mode === "text" ? <MicIcon /> : <KeyboardIcon />}
  </div>
);

export default ModeToggle;
