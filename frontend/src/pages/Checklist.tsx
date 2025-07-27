import { useEffect, useState } from "react";
import { getCurrentChecklist } from "../api/api";
import type { GetChecklistResponse } from "../api/model";
import { useTheme } from "../contexts/useTheme";
import Navbar from "../components/Navbar";
import "./Checklist.css";

export const Checklist = () => {
  const [checklist, setChecklist] = useState<GetChecklistResponse | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    getCurrentChecklist().then(setChecklist);
  }, []);

  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Emergency Checklist" />
      <div className="checklist-content-container">
        <ul className="checklist">
          {checklist?.checklist.map((item, index) => (
            <li key={index} className="checklist-item">
              <input type="checkbox" id={`item-${index}`} />
              <label htmlFor={`item-${index}`}>{item}</label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
