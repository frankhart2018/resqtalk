import React from 'react';
import Chatbot from './components/Chatbot';
import './App.css';
import { registerTool } from './tools/tool-utils';
import { playSound, stopSound } from './tools/sound-tools';

registerTool("playSound", "Play a siren, this can be used to alert others in case of emergency/disasters", [], playSound);
registerTool("stopSound", "Stop the siren", [], stopSound);

const App: React.FC = () => {
  return (
    <div className="App">
      <Chatbot />
    </div>
  );
};

export default App;
