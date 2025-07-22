import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RobotIcon from "./RobotIcon";
import { getCurrentPrivileges } from "../api/api";
import type { GetCurrentPrivilegesResponse } from "../api/model";

const GodModeNav: React.FC = () => {
  const [isGodMode, setIsGodMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentPrivileges().then((data: GetCurrentPrivilegesResponse) => {
      setIsGodMode(data.isGodMode);
    });
  }, []);

  return (
    <>
      {isGodMode && (
        <span onClick={() => navigate("/god")}>
          <RobotIcon />
        </span>
      )}
    </>
  );
};

export default GodModeNav;
