import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/useTheme";
import { useNavigate } from "react-router-dom";
import {
  getCurrentPrivileges,
  getSystemPrompt,
  setSystemPrompt,
  getMemories,
  deleteUser,
  getUserDetails,
  runChecklistAgent,
  deleteMemories,
} from "../api/api";
import type {
  GetCurrentPrivilegesResponse,
  GetSystempPromptResponse,
  GetMemoriesResponse,
  GetUserDetailsResponse,
} from "../api/model";
import "./Agent.css";
import "./GodMode.css";

const GodMode: React.FC = () => {
  const { theme } = useTheme();
  const [isGodMode, setIsGodMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [communicationAgentPrompt, setCommunicationAgentPrompt] = useState("");
  const [memoryAgentPrompt, setMemoryAgentPrompt] = useState("");
  const [checklistAgentPrompt, setChecklistAgentPrompt] = useState("");
  const [
    checklistAgentForceChecklistPrompt,
    setChecklistAgentForceChecklistPrompt,
  ] = useState("");
  const [memories, setMemories] = useState<
    Array<Array<Record<string, unknown>>>
  >([]);
  const [userDetails, setUserDetails] = useState<GetUserDetailsResponse | null>(
    null
  );
  const [selectedDisaster, setSelectedDisaster] = useState("earthquake");
  const [selectedPhase, setSelectedPhase] = useState("pre");
  const [checklistAgentOutput, setChecklistAgentOutput] = useState("");
  const [isChecklistAgentRunning, setIsChecklistAgentRunning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentPrivileges()
      .then((data: GetCurrentPrivilegesResponse) => {
        setIsGodMode(data.isGodMode);
        if (!data.isGodMode) {
          navigate("/");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    getSystemPrompt("communication-agent-sys-prompt").then(
      (data: GetSystempPromptResponse) => {
        setCommunicationAgentPrompt(data.prompt);
      }
    );

    getSystemPrompt("memory-agent-sys-prompt").then(
      (data: GetSystempPromptResponse) => {
        setMemoryAgentPrompt(data.prompt);
      }
    );

    getSystemPrompt("checklist-agent-sys-prompt").then(
      (data: GetSystempPromptResponse) => {
        setChecklistAgentPrompt(data.prompt);
      }
    );

    getSystemPrompt("checklist-agent-force-checklist-sys-prompt").then(
      (data: GetSystempPromptResponse) => {
        setChecklistAgentForceChecklistPrompt(data.prompt);
      }
    );

    getMemories().then((data: GetMemoriesResponse) => {
      setMemories(data.memories);
    });

    getUserDetails()
      .then((data: GetUserDetailsResponse) => {
        setUserDetails(data);
      })
      .catch((error) => {
        console.error("Error fetching user details:", error);
        setUserDetails(null);
      });
  }, [navigate]);

  const handleSave = async (key: string, prompt: string) => {
    await setSystemPrompt(key, prompt).then(() => {
      alert("Successfully saved system prompt!");
      window.location.reload();
    });
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser();
      alert("User data deleted successfully!");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("An error occurred while deleting user data.");
    }
  };

  const handleDeleteMemories = async () => {
    try {
      await deleteMemories();
      alert("Memories wiped successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error wiping memories:", error);
      alert("An error occurred while wiping memories.");
    }
  };

  const handleRunChecklistAgent = async () => {
    setIsChecklistAgentRunning(true);
    try {
      const response = await runChecklistAgent(selectedDisaster, selectedPhase);
      setChecklistAgentOutput(JSON.stringify(response.checklist, null, 2));
      alert("Checklist agent ran successfully!");
    } catch (error) {
      console.error("Error running checklist agent:", error);
      alert("An error occurred while running the checklist agent.");
    } finally {
      setIsChecklistAgentRunning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          try {
            const json = JSON.parse(content);
            localStorage.setItem("chatMessages", JSON.stringify(json));
            alert("Chat history loaded successfully!");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            alert("Invalid JSON file.");
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return isLoading ? (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Loading..." />
    </div>
  ) : isGodMode ? (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="भगवान Mode" />
      <div className="god-mode-content">
        <div className="prompt-box">
          <label htmlFor="communication-agent-prompt">
            Communication Agent System Prompt
          </label>
          <textarea
            id="communication-agent-prompt"
            value={communicationAgentPrompt}
            onChange={(e) => setCommunicationAgentPrompt(e.target.value)}
            rows={10}
          />
          <button
            className="chatbot-button"
            onClick={() =>
              handleSave(
                "communication-agent-sys-prompt",
                communicationAgentPrompt
              )
            }
          >
            Save
          </button>
        </div>
        <div className="prompt-box">
          <label htmlFor="memory-agent-prompt">
            Memory Agent System Prompt
          </label>
          <textarea
            id="memory-agent-prompt"
            value={memoryAgentPrompt}
            onChange={(e) => setMemoryAgentPrompt(e.target.value)}
            rows={10}
          />
          <button
            className="chatbot-button"
            onClick={() =>
              handleSave("memory-agent-sys-prompt", memoryAgentPrompt)
            }
          >
            Save
          </button>
        </div>
        <div className="prompt-box">
          <label htmlFor="checklist-agent-prompt">
            Checklist Agent System Prompt
          </label>
          <textarea
            id="checklist-agent-prompt"
            value={checklistAgentPrompt}
            onChange={(e) => setChecklistAgentPrompt(e.target.value)}
            rows={10}
          />
          <div className="checklist-controls">
            <select
              value={selectedDisaster}
              onChange={(e) => setSelectedDisaster(e.target.value)}
            >
              <option value="earthquake">Earthquake</option>
              <option value="tornado">Tornado</option>
              <option value="flood">Flood</option>
            </select>
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
            >
              <option value="pre">Pre-Disaster</option>
              <option value="post">Post-Disaster</option>
            </select>
          </div>
          <div className="checklist-buttons">
            <button
              className="chatbot-button"
              onClick={handleRunChecklistAgent}
              disabled={isChecklistAgentRunning}
            >
              {isChecklistAgentRunning
                ? "Running Checklist Agent..."
                : "Run Checklist Agent"}
            </button>
            <button
              className="chatbot-button"
              onClick={() =>
                handleSave("checklist-agent-sys-prompt", checklistAgentPrompt)
              }
            >
              Save
            </button>
          </div>
          {checklistAgentOutput && (
            <div className="prompt-box">
              <label htmlFor="checklist-agent-output">
                Checklist Agent Output
              </label>
              <br />
              <textarea
                id="checklist-agent-output"
                value={checklistAgentOutput}
                readOnly
                rows={10}
              />
            </div>
          )}
        </div>
        <div className="prompt-box">
          <label htmlFor="checklist-agent-force-checklist-prompt">
            Checklist Agent Force Checklist System Prompt
          </label>
          <textarea
            id="checklist-agent-force-checklist-prompt"
            value={checklistAgentForceChecklistPrompt}
            onChange={(e) =>
              setChecklistAgentForceChecklistPrompt(e.target.value)
            }
            rows={10}
          />
          <button
            className="chatbot-button"
            onClick={() =>
              handleSave(
                "checklist-agent-force-checklist-sys-prompt",
                checklistAgentForceChecklistPrompt
              )
            }
          >
            Save
          </button>
        </div>
        <div className="prompt-box">
          <label htmlFor="memories">Memories</label>
          <pre className="memories-list">
            {JSON.stringify(memories, null, 4)}
          </pre>
          <button className="delete-user-button" onClick={handleDeleteMemories}>
            Wipe Memories (गजनी Mode)
          </button>
          <div className="prompt-box chat-upload-section">
            <label htmlFor="chat-upload">Load chat</label>
            <input
              type="file"
              id="chat-upload"
              accept=".json"
              onChange={handleFileUpload}
            />
          </div>
        </div>
        <div className="prompt-box">
          <label htmlFor="user-details">User Details</label>
          <div className="user-details-display">
            {userDetails && (
              <>
                <h3>Primary User Details:</h3>
                <p>Name: {userDetails.primaryUserDetails.name}</p>
                <p>Age: {userDetails.primaryUserDetails.age}</p>
                <p>Gender: {userDetails.primaryUserDetails.gender}</p>
                <p>
                  Allergies:{" "}
                  {userDetails.primaryUserDetails.allergies.join(", ")}
                </p>
                <p>
                  Medications:{" "}
                  {userDetails.primaryUserDetails.medications.join(", ")}
                </p>

                {userDetails.dependentUserDetails.length > 0 && (
                  <>
                    <h3>Dependent User Details:</h3>
                    {userDetails.dependentUserDetails.map(
                      (dependent, index) => (
                        <div key={index} className="dependent-details">
                          <h4>Dependent {index + 1}:</h4>
                          <p>Name: {dependent.name}</p>
                          <p>Age: {dependent.age}</p>
                          <p>Gender: {dependent.gender}</p>
                          <p>Relationship: {dependent.relationship}</p>
                          <p>Allergies: {dependent.allergies.join(", ")}</p>
                          <p>Medications: {dependent.medications.join(", ")}</p>
                        </div>
                      )
                    )}
                  </>
                )}

                <h3>Location:</h3>
                <p>Latitude: {userDetails.location.latitude}</p>
                <p>Longitude: {userDetails.location.longitude}</p>

                <h3>Selected Disasters:</h3>
                <p>{userDetails.selectedDisasters.join(", ")}</p>
              </>
            )}
          </div>
        </div>
        <button className="delete-user-button" onClick={handleDeleteUser}>
          Delete Current User
        </button>
      </div>
    </div>
  ) : null;
};

export default GodMode;
