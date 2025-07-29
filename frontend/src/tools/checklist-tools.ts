import type { GetChecklistResponse } from "../api/model";

export const addToList = (params: Record<string, unknown>) => {
  const item = params.item;
  if (typeof item !== 'string' || item.trim() === '') {
    console.error("Invalid item provided to addToList");
    return;
  }

  const storedChecklist = localStorage.getItem("checklist");
  const storedCheckedItems = localStorage.getItem("checkedItems");

  const checklist: GetChecklistResponse = storedChecklist
    ? JSON.parse(storedChecklist)
    : { checklist: [] };
  const checkedItems: boolean[] = storedCheckedItems
    ? JSON.parse(storedCheckedItems)
    : [];

  checklist.checklist.push(item);
  checkedItems.push(false);

  localStorage.setItem("checklist", JSON.stringify(checklist));
  localStorage.setItem("checkedItems", JSON.stringify(checkedItems));
};
