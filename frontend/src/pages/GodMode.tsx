import React, { useState, useEffect } from "react";
import ThemeToggle from "../components/ThemeToggle";
import BackIcon from "../components/BackIcon";
import { useNavigate } from "react-router-dom";
import {
  getCurrentPrivileges,
  getSystemPrompt,
  setSystemPrompt,
  getMemories,
  deleteUser,
  getUserDetails,
} from "../api/api";
import type {
  GetCurrentPrivilegesResponse,
  GetSystempPromptResponse,
  GetMemoriesResponse,
  GetUserDetailsResponse,
} from "../api/model";
import "./Chatbot.css";
import "./GodMode.css";

const GodMode: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const [isGodMode, setIsGodMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [communicationAgentPrompt, setCommunicationAgentPrompt] = useState("");
  const [memoryAgentPrompt, setMemoryAgentPrompt] = useState("");
  const [memories, setMemories] = useState<
    Array<Array<Record<string, unknown>>>
  >([]);
  const [userDetails, setUserDetails] = useState<GetUserDetailsResponse | null>(
    null
  );
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

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const handleSave = async (key: string, prompt: string) => {
    await setSystemPrompt(key, prompt);
    window.location.reload();
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

  return isLoading ? (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <div className="chatbot-header-title">Loading...</div>
      </div>
    </div>
  ) : isGodMode ? (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <span onClick={() => navigate("/")}>
          <BackIcon />
        </span>
        <div className="chatbot-header-title">ResQTalk</div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
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
          <label htmlFor="memories">Memories</label>
          <pre className="memories-list">
            {JSON.stringify(memories, null, 4)}
          </pre>
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
