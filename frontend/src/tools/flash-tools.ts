let flashingInterval: NodeJS.Timeout | null = null;
let flashOverlay: HTMLDivElement | null = null;

const createFlashOverlay = () => {
  if (flashOverlay) return;
  flashOverlay = document.createElement('div');
  flashOverlay.className = 'flash-overlay';
  document.body.appendChild(flashOverlay);
  flashOverlay.addEventListener('click', stopFlash);
};

const removeFlashOverlay = () => {
  if (flashOverlay) {
    flashOverlay.removeEventListener('click', stopFlash);
    document.body.removeChild(flashOverlay);
    flashOverlay = null;
  }
};

export const startFlash = () => {
  if (flashingInterval) return;

  createFlashOverlay();
  let isWhite = true;
  if (flashOverlay) {
    flashOverlay.style.backgroundColor = 'white';
    flashingInterval = setInterval(() => {
      if (flashOverlay) {
        isWhite = !isWhite;
        flashOverlay.style.backgroundColor = isWhite ? 'white' : 'black';
      }
    }, 500);
  }
};

export const stopFlash = () => {
  if (flashingInterval) {
    clearInterval(flashingInterval);
    flashingInterval = null;
  }
  removeFlashOverlay();
};