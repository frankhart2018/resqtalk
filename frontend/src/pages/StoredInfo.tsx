import React, { useState, useEffect } from "react";
import ThemeToggle from "../components/ThemeToggle";
import GodModeNav from "../components/GodModeNav";
import { getUserDetails } from "../api/api";
import type { GetUserDetailsResponse } from "../api/model";
import "./Chatbot.css";
import LocationMap from "../components/LocationMap";
import "./Onboarding.css";
import "./StoredInfo.css";

const StoredInfo: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const [userDetails, setUserDetails] = useState<GetUserDetailsResponse | null>(
    null
  );

  useEffect(() => {
    getUserDetails()
      .then((data: GetUserDetailsResponse) => {
        setUserDetails(data);
      })
      .catch((error) => {
        console.error("Error fetching user details:", error);
        setUserDetails(null);
      });
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <GodModeNav />
        <div className="chatbot-header-title">ResQTalk</div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <div className="onboarding-container">
        <h3 className="stored-info-section-title">User Details</h3>
        <>
          {userDetails && (
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
                  <div className="detected-location-text">
                    Latitude {userDetails.location.latitude}, Longitude{" "}
                    {userDetails.location.longitude}
                  </div>
                )}
              {userDetails.location.latitude &&
                userDetails.location.longitude && (
                  <LocationMap
                    latitude={userDetails.location.latitude.toString()}
                    longitude={userDetails.location.longitude.toString()}
                    useOnline={true}
                  />
                )}
            </form>
          )}
          {!userDetails && <p>Loading user details or no user data found.</p>}
        </>
      </div>
    </div>
  );
};

export default StoredInfo;
