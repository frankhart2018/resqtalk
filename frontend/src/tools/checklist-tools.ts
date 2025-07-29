import { GetChecklistResponse } from "../api/model";
import { registerTool } from "./tool-utils";

const addChecklistToLocalStorage = (checklist: GetChecklistResponse) => {
  localStorage.setItem("checklist", JSON.stringify(checklist));
};

registerTool(
  "addChecklistToLocalStorage",
  "Adds a checklist to the local storage.",
  [
    {
      name: "checklist",
      type: "object",
      required: true,
    },
  ],
  null,
  (params: Record<string, unknown>) => {
    addChecklistToLocalStorage(params.checklist as GetChecklistResponse);
  }
);
