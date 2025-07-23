const getBestVoice = (): SpeechSynthesisVoice => {
  const voices = speechSynthesis.getVoices();
  const preferredVoices = [
    "Daniel",
    "Daniel (English (United Kingdom))",
    "Google US English",
    "Microsoft David",
    "Microsoft Mark",
    "Alex",
    "Samantha",
  ];

  for (const preferred of preferredVoices) {
    const voice = voices.find((v) => v.name === preferred);
    if (voice) return voice;
  }

  return voices.find((v) => v.lang.startsWith("en")) || voices[0];
};

export const playSpeech = (text: string) => {
  const tts = new SpeechSynthesisUtterance(text);
  tts.voice = getBestVoice();
  console.log(`Using voice: ${tts.voice ? tts.voice.name : "UNK"}`);

  window.speechSynthesis.speak(tts);
};
