import React, { useState, useEffect } from "react";
import "./Onboarding.css";
import { submitOnboarding } from "../api/api";
import type { OnboardingData } from "../api/model";
import ThemeToggle from "../components/ThemeToggle";
import LocationMap from "../components/LocationMap";
import { useNavigate } from "react-router-dom";
import GodModeNav from "../components/GodModeNav";

interface PrimaryUserDetails {
  name: string;
  age: string;
  gender: "male" | "female";
  allergies: string;
  medications: string;
}

interface DependentUserDetails extends PrimaryUserDetails {
  relationship: string;
}

interface Location {
  latitude: string;
  longitude: string;
}

const Onboarding = () => {
  const [primaryUserDetails, setPrimaryUserDetails] =
    useState<PrimaryUserDetails>({
      name: "",
      age: "",
      gender: "male",
      allergies: "",
      medications: "",
    });
  const [dependentUserDetails, setDependentUserDetails] = useState<
    DependentUserDetails[]
  >([]);
  const [location, setLocation] = useState<Location>({
    latitude: "",
    longitude: "",
  });
  const [selectedDisasters, setSelectedDisasters] = useState<string[]>([]);
  const [theme, setTheme] = useState("dark");
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const handlePrimaryUserChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPrimaryUserDetails({ ...primaryUserDetails, [name]: value });
  };

  const handleDependentChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const dependents = [...dependentUserDetails];
    dependents[index] = { ...dependents[index], [name]: value };
    setDependentUserDetails(dependents);
  };

  const addDependent = () => {
    setDependentUserDetails([
      ...dependentUserDetails,
      {
        name: "",
        age: "",
        gender: "male",
        relationship: "",
        allergies: "",
        medications: "",
      },
    ]);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert(
            "Could not retrieve your location. Please enable location services."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, []);

  const handleDisasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setSelectedDisasters((prevSelected) =>
      checked
        ? [...prevSelected, value]
        : prevSelected.filter((d) => d !== value)
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedDisasters.length === 0) {
      alert("Please select at least one disaster.");
      return;
    }
    const data: OnboardingData = {
      primaryUserDetails: {
        ...primaryUserDetails,
        age: parseInt(primaryUserDetails.age, 10),
        allergies: primaryUserDetails.allergies.split(",").map((s) => s.trim()),
        medications: primaryUserDetails.medications
          .split(",")
          .map((s) => s.trim()),
      },
      dependentUserDetails: dependentUserDetails.map((d) => ({
        ...d,
        age: parseInt(d.age, 10),
        allergies: d.allergies.split(",").map((s) => s.trim()),
        medications: d.medications.split(",").map((s) => s.trim()),
      })),
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      },
      selectedDisasters,
    };

    try {
      const result = await submitOnboarding(data);
      if (result.status === "already_registered") {
        alert("User already onboarded!");
      } else {
        alert("Onboarding successful!");
        navigate("/");
      }
    } catch (error) {
      console.error("Error during onboarding:", error);
      alert("An error occurred during onboarding.");
    }
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <GodModeNav />
        <div className="chatbot-header-title">Onboarding</div>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <div className="onboarding-container">
        <form onSubmit={handleSubmit}>
          <h2>Primary User</h2>
          <input
            name="name"
            value={primaryUserDetails.name}
            onChange={handlePrimaryUserChange}
            placeholder="Name"
            required
          />
          <input
            name="age"
            value={primaryUserDetails.age}
            onChange={handlePrimaryUserChange}
            placeholder="Age"
            type="number"
            required
          />
          <select
            name="gender"
            value={primaryUserDetails.gender}
            onChange={handlePrimaryUserChange}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <input
            name="allergies"
            value={primaryUserDetails.allergies}
            onChange={handlePrimaryUserChange}
            placeholder="Allergies (comma-separated)"
          />
          <input
            name="medications"
            value={primaryUserDetails.medications}
            onChange={handlePrimaryUserChange}
            placeholder="Medications (comma-separated)"
          />

          <h2>Dependents</h2>
          {dependentUserDetails.map((dependent, index) => (
            <div key={index} className="dependent-section">
              <input
                name="name"
                value={dependent.name}
                onChange={(e) => handleDependentChange(index, e)}
                placeholder="Name"
                required
              />
              <input
                name="age"
                value={dependent.age}
                onChange={(e) => handleDependentChange(index, e)}
                placeholder="Age"
                type="number"
                required
              />
              <select
                name="gender"
                value={dependent.gender}
                onChange={(e) => handleDependentChange(index, e)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input
                name="relationship"
                value={dependent.relationship}
                onChange={(e) => handleDependentChange(index, e)}
                placeholder="Relationship"
                required
              />
              <input
                name="allergies"
                value={dependent.allergies}
                onChange={(e) => handleDependentChange(index, e)}
                placeholder="Allergies (comma-separated)"
              />
              <input
                name="medications"
                value={dependent.medications}
                onChange={(e) => handleDependentChange(index, e)}
                placeholder="Medications (comma-separated)"
              />
            </div>
          ))}
          <button type="button" onClick={addDependent}>
            Add Dependent
          </button>

          <h2>Select Disasters</h2>
          <div className="disaster-checkboxes">
            <label>
              <input
                type="checkbox"
                value="earthquake"
                checked={selectedDisasters.includes("earthquake")}
                onChange={handleDisasterChange}
              />
              Earthquake
            </label>
            <label>
              <input
                type="checkbox"
                value="tornado"
                checked={selectedDisasters.includes("tornado")}
                onChange={handleDisasterChange}
              />
              Tornado
            </label>
            <label>
              <input
                type="checkbox"
                value="flood"
                checked={selectedDisasters.includes("flood")}
                onChange={handleDisasterChange}
              />
              Flood
            </label>
          </div>

          <h2>Location</h2>
          {location.latitude && location.longitude && (
            <div className="detected-location-text">
              Latitude {location.latitude}, Longitude {location.longitude}
            </div>
          )}
          {location.latitude && location.longitude && (
            <LocationMap
              latitude={location.latitude}
              longitude={location.longitude}
            />
          )}

          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
