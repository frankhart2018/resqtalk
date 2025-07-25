import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useTheme } from "../contexts/useTheme";
import { getUserDetails } from "../api/api";
import type { GetUserDetailsResponse } from "../api/model";
import "./Chatbot.css"; 
import LocationMap from "../components/LocationMap";
import "./Maps.css";

const Maps: React.FC = () => {
  const { theme } = useTheme();
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

  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Maps" />
      <div className="maps-container">
        {userDetails && userDetails.location.latitude && userDetails.location.longitude ? (
          <>
            <p>
              Latitude: {userDetails.location.latitude}, Longitude: {userDetails.location.longitude}
            </p>
            <LocationMap
              latitude={userDetails.location.latitude.toString()}
              longitude={userDetails.location.longitude.toString()}
              useOnline={false}
              height="75vh"
            />
          </>
        ) : (
          <p>Loading location data or no location found.</p>
        )}
      </div>
    </div>
  );
};

export default Maps;
