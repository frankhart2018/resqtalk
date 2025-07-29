import React from "react";
import Chatbot from "./pages/Chatbot";
import GodMode from "./pages/GodMode";
import Onboarding from "./pages/Onboarding";
import Begin from "./pages/Begin";
import Dashboard from "./pages/Dashboard";
import StoredInfo from "./pages/StoredInfo";
import SOSTools from "./pages/SOSTools";
import NotFound from "./pages/NotFound";
import LiveAlerts from "./pages/LiveAlerts";
import Maps from "./pages/Maps";
import { Checklist } from "./pages/Checklist";
import "./App.css";
import { registerTool } from "./tools/tool-utils";
import { playSound, stopSound } from "./tools/sound-tools";
import { getLocation, LOCATION_RESULT } from "./tools/location-tools";
import { startFlash, stopFlash } from "./tools/flash-tools";
import "./tools/checklist-tools";
import { Routes, Route,Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";

registerTool(
  "playSound",
  "Play a siren, this can be used to alert others in case of emergency/disasters",
  [],
  null,
  playSound
);
registerTool("stopSound", "Stop the siren", [], null, stopSound);
registerTool(
  "getLocation",
  "Fetch the user's current location/Tell them their location",
  [],
  LOCATION_RESULT,
  getLocation
);
registerTool(
  "startFlash",
  "Start a flashing light on the screen to attract attention",
  [],
  null,
  startFlash
);
registerTool(
  "stopFlash",
  "Stop the flashing light on the screen",
  [],
  null,
  stopFlash
);

const App: React.FC = () => {
  getLocation();

  return (
    <ThemeProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/onboard" />} />
          <Route path="/chat" element={<Chatbot />} />
          <Route path="/god" element={<GodMode />} />
          <Route path="/onboard" element={<Onboarding />} />
          <Route path="/begin" element={<Begin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/info" element={<StoredInfo />} />
          <Route path="/sos" element={<SOSTools />} />
          <Route path="/alerts" element={<LiveAlerts />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
};

export default App;
