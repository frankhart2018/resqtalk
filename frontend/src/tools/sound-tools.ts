let audio: HTMLAudioElement | null = null;

export const playSound = () => {
    if (audio === null) {
        audio = new Audio('/siren.mp3');
        audio.play();
    }
}

export const stopSound = () => {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
    }
}

