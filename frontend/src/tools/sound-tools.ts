import { registerTool } from "./tool-utils";

let audio: HTMLAudioElement | null = null;

export const playSound = () => {
    audio = new Audio('/siren.mp3');
    audio.play();
}

export const stopSound = () => {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

registerTool("playSound", "Play a siren, this can be used to alert others in case of emergency/disasters", [], playSound);
registerTool("stopSound", "Stop the siren", [], stopSound);