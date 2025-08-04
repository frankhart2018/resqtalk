import React, { useState, useEffect } from "react";
import { getUserDetails, getMemories } from "../api/api";
import type { GetUserDetailsResponse, GetMemoriesResponse } from "../api/model";
import "./Agent.css";
import "./Onboarding.css";
import "./StoredInfo.css";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/useTheme";

const StoredInfo: React.FC = () => {
  const { theme } = useTheme();
  const [userDetails, setUserDetails] = useState<GetUserDetailsResponse | null>(
    null
  );
  const [memories, setMemories] = useState<GetMemoriesResponse | null>(null);

  useEffect(() => {
    getUserDetails()
      .then((data: GetUserDetailsResponse) => {
        setUserDetails(data);
      })
      .catch((error) => {
        console.error("Error fetching user details:", error);
        setUserDetails(null);
      });

    getMemories()
      .then((data: GetMemoriesResponse) => {
        setMemories(data);
      })
      .catch((error) => {
        console.error("Error fetching memories:", error);
        setMemories(null);
      });
  }, []);

  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Stored Info" />
      <div className="onboarding-container">
        
          {userDetails ? (
            <form>
              <h2>Primary User</h2>
              <label>Name:</label>
              <input
                name="name"
                value={userDetails.primaryUserDetails.name}
                readOnly
              />
              <label>Age:</label>
              <input
                name="age"
                value={userDetails.primaryUserDetails.age}
                type="number"
                readOnly
              />
              <label>Gender:</label>
              <select
                name="gender"
                value={userDetails.primaryUserDetails.gender}
                disabled
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <label>Allergies:</label>
              <input
                name="allergies"
                value={userDetails.primaryUserDetails.allergies.join(", ")}
                readOnly
              />
              <label>Medications:</label>
              <input
                name="medications"
                value={userDetails.primaryUserDetails.medications.join(", ")}
                readOnly
              />

              <h2>Dependents</h2>
              {userDetails.dependentUserDetails.length === 0 ? (
                <p>No dependents registered.</p>
              ) : (
                userDetails.dependentUserDetails.map((dependent, index) => (
                  <div key={index} className="dependent-section">
                    <h4>Dependent {index + 1}:</h4>
                    <label>Name:</label>
                    <input name="name" value={dependent.name} readOnly />
                    <label>Age:</label>
                    <input
                      name="age"
                      value={dependent.age}
                      type="number"
                      readOnly
                    />
                    <label>Gender:</label>
                    <select name="gender" value={dependent.gender} disabled>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <label>Relationship:</label>
                    <input
                      name="relationship"
                      value={dependent.relationship}
                      readOnly
                    />
                    <label>Allergies:</label>
                    <input
                      name="allergies"
                      value={dependent.allergies.join(", ")}
                      readOnly
                    />
                    <label>Medications:</label>
                    <input
                      name="medications"
                      value={dependent.medications.join(", ")}
                      readOnly
                    />
                  </div>
                ))
              )}

              <h2>Selected Disasters</h2>
              <div className="disaster-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    value="earthquake"
                    checked={userDetails.selectedDisasters.includes(
                      "earthquake"
                    )}
                    readOnly
                  />
                  Earthquake
                </label>
                <label>
                  <input
                    type="checkbox"
                    value="tornado"
                    checked={userDetails.selectedDisasters.includes("tornado")}
                    readOnly
                  />
                  Tornado
                </label>
                <label>
                  <input
                    type="checkbox"
                    value="flood"
                    checked={userDetails.selectedDisasters.includes("flood")}
                    readOnly
                  />
                  Flood
                </label>
              </div>

              <h2>Location</h2>
              {userDetails.location.latitude &&
                userDetails.location.longitude && (
                  <div className="stored-info-location">
                    Latitude: {userDetails.location.latitude} <br />
                    Longitude: {userDetails.location.longitude}
                  </div>
                )}
            </form>
          ) : (
            <p>Loading user details or no user data found.</p>
          )}

          <h2>Memories</h2>
          {memories && memories.memories.length > 0 ? (
            <ul className="memory-list">
              {memories.memories.flat().map((memory, index) => (
                <li key={index} className="memory-item">
                  {Object.entries(memory)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ")}
                </li>
              ))}
            </ul>
          ) : (
            <p>No memories found.</p>
          )}
        
      </div>
    </div>
  );
};

export default StoredInfo;
