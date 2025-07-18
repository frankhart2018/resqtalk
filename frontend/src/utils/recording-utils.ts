import {
  MediaRecorder as ExtendableMediaRecorder,
  type IMediaRecorder,
  type IBlobEvent,
} from "extendable-media-recorder";

let audioBlobs: Blob[] = [];
let capturedStream: MediaStream | null = null;
let mediaRecorder: IMediaRecorder | null = null;

export const startRecordingAudio = async () => {
  try {
    if (!ExtendableMediaRecorder.isTypeSupported("audio/wav")) {
      throw new Error("audio/wav not supported by this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    capturedStream = stream;
    audioBlobs = [];

    mediaRecorder = new ExtendableMediaRecorder(stream, {
      mimeType: "audio/wav",
    });

    mediaRecorder.addEventListener(
      "dataavailable",
      function (this: IMediaRecorder, event: IBlobEvent) {
        audioBlobs.push(event.data);
      }
    );

    mediaRecorder.start();
    console.log("🎙️ Recording started with type:", mediaRecorder.mimeType);
  } catch (error) {
    console.error("Failed to start recording:", error);
    alert("Microphone permission denied or WAV not supported.");
  }
};

export const stopRecordingAudio = (): Promise<Blob | null> =>
  new Promise((resolve) => {
    if (!mediaRecorder) return resolve(null);

    mediaRecorder.addEventListener("stop", () => {
      const audioBlob = new Blob(audioBlobs, { type: "audio/wav" });
      console.log("🎙️ Recording stopped. Blob size:", audioBlob.size);
      if (capturedStream) {
        capturedStream.getTracks().forEach((track) => track.stop());
      }
      resolve(audioBlob);
    });

    mediaRecorder.stop();
  });
