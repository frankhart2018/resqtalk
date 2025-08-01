import { useEffect, useState } from "react";
import { getCurrentChecklist } from "../api/api";
import type { GetChecklistResponse } from "../api/model";
import { useTheme } from "../contexts/useTheme";
import Navbar from "../components/Navbar";
import "./Checklist.css";

export const Checklist = () => {
  const [checklist, setChecklist] = useState<GetChecklistResponse | null>(() => {
    const storedChecklist = localStorage.getItem("checklist");
    return storedChecklist ? JSON.parse(storedChecklist) : null;
  });
  const [checkedItems, setCheckedItems] = useState<boolean[]>(() => {
    const storedCheckedItems = localStorage.getItem("checkedItems");
    return storedCheckedItems ? JSON.parse(storedCheckedItems) : [];
  });
  const { theme } = useTheme();

  useEffect(() => {
    if (!checklist) {
      getCurrentChecklist().then((response) => {
        setChecklist(response);
        setCheckedItems(new Array(response.checklist.length).fill(false));
      });
    }
  }, [checklist]);

  useEffect(() => {
    if (checklist) {
      localStorage.setItem("checklist", JSON.stringify(checklist));
    }
    if (checkedItems.length > 0) {
      localStorage.setItem("checkedItems", JSON.stringify(checkedItems));
    }
  }, [checklist, checkedItems]);

  const handleCheckboxChange = (index: number) => {
    const newCheckedItems = [...checkedItems];
    newCheckedItems[index] = !newCheckedItems[index];
    setCheckedItems(newCheckedItems);
  };

  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Emergency Checklist" />
      <div className="checklist-content-container">
        <ul className="checklist">
          {checklist?.checklist.map((item, index) => (
            <li key={index} className={`checklist-item ${checkedItems[index] ? 'checked' : ''}`}>
              <input
                type="checkbox"
                id={`item-${index}`}
                checked={checkedItems[index] || false}
                onChange={() => handleCheckboxChange(index)}
              />
              <label htmlFor={`item-${index}`}>{item}</label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
