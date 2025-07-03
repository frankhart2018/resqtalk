import React from 'react';
import './ThemeToggle.css';
import SunIcon from './SunIcon';
import MoonIcon from './MoonIcon';

interface ThemeToggleProps {
  theme: string;
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <div className="theme-toggle" onClick={toggleTheme}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </div>
  );
};

export default ThemeToggle;