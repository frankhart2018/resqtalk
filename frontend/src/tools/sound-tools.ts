let audio: HTMLAudioElement | null = null;

export const playSound = () => {
  if (!audio) {
    audio = new Audio('/siren.mp3');
    audio.loop = true;
  }
  audio.play();

  const overlay = document.createElement('div');
  overlay.className = 'sound-overlay';

  const stopButton = document.createElement('button');
  stopButton.className = 'stop-sound-button';
  stopButton.innerText = 'Stop Sound';
  stopButton.onclick = stopSound;

  overlay.appendChild(stopButton);
  document.body.appendChild(overlay);
};

export const stopSound = () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  const overlay = document.querySelector('.sound-overlay');
  if (overlay) {
    overlay.remove();
  }
};

