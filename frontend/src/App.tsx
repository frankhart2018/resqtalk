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
import { playSound } from "./tools/sound-tools";
import { getLocation, LOCATION_RESULT } from "./tools/location-tools";
import { startFlash } from "./tools/flash-tools";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { addToList } from "./tools/checklist-tools";
import {
  navigateToList,
  navigateToLiveAlerts,
  navigateToMaps,
} from "./tools/nav-tools";

registerTool(
  "playSound",
  "Play a siren, this can be used to alert others in case of emergency/disasters",
  "ONLY when user is physically trapped and needs rescuers to find them",
  [],
  null,
  playSound
);
registerTool(
  "getLocation",
  "Fetch the user's current location/Tell them their location",
  "ONLY when user explicitly asks for coordinates to share with 911/rescuers",
  [],
  LOCATION_RESULT,
  getLocation
);
registerTool(
  "startFlash",
  "Start a flashing light on the screen to attract attention",
  "ONLY when it's dark AND user needs visual location assistance for rescue",
  [],
  null,
  startFlash
);
registerTool(
  "addToList",
  "Add items to the checklist",
  "When you think something needs to be added to the checklist",
  [{ name: "item", type: "string", required: true }],
  null,
  addToList
);
registerTool(
  "navigateToMaps",
  "Take the user to maps page for helping them navigate",
  "ONLY when the user needs to get out of some place or specifically asks for navigation",
  [],
  null,
  navigateToMaps
);
registerTool(
  "navigateToList",
  "Take the user to checklist page",
  "When the user specifically asks for it, or when you NEED to remind user to get back to checklist",
  [],
  null,
  navigateToList
);
registerTool(
  "navigateToLiveAlerts",
  "Take the user to live alerts page",
  "ONLY when the user asks for checking live alerts",
  [],
  null,
  navigateToLiveAlerts
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
