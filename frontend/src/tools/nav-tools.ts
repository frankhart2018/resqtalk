const navigateToPage = (title: string, url: string) => {
  const overlay = document.createElement("div");
  overlay.className = "navigation-overlay";

  const navigateToMapsButton = document.createElement("button");
  navigateToMapsButton.className = "navigate-button";
  navigateToMapsButton.innerText = `Take me to ${title}`;
  navigateToMapsButton.onclick = () => {
    window.location.href = url;
  };

  overlay.appendChild(navigateToMapsButton);
  document.body.appendChild(overlay);
};

export const navigateToMaps = () => {
  navigateToPage("Maps", "/maps");
};

export const navigateToLiveAlerts = () => {
  navigateToPage("Live Alerts", "/alerts");
};

export const navigateToList = () => {
  navigateToPage("Checklist", "/checklist");
};
