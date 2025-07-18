import React from "react";
import Chatbot from "./pages/Chatbot";
import "./App.css";
import { registerTool } from "./tools/tool-utils";
import { playSound, stopSound } from "./tools/sound-tools";
import { getLocation, LOCATION_RESULT } from "./tools/location-tools";

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

const App: React.FC = () => {
  getLocation();

  return (
    <div className="App">
      <Chatbot />
    </div>
  );
};

export default App;
