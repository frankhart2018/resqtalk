// Chatbot.tsx
import React, {
  useState,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Chatbot.css";
import ThemeToggle from "../components/ThemeToggle";
import ModeToggle from "../components/ModeToggle";
import { executeToolCall, getPromptWithTools } from "../tools/tool-utils";
import {
  MediaRecorder as ExtendableMediaRecorder,
  type IMediaRecorder,
  type IBlobEvent,
  register,
} from "extendable-media-recorder";
import { connect } from "extendable-media-recorder-wav-encoder";

let audioBlobs: Blob[] = [];
let capturedStream: MediaStream | null = null;
let mediaRecorder: IMediaRecorder | null = null;
let encoderRegistered = false;
const API_HOST =
  import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8000`;

const registerWavEncoder = async () => {
  if (!encoderRegistered) {
    await register(await connect());
    encoderRegistered = true;
    console.log("WAV encoder registered.");
  }
};

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "bot" }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState("text");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    registerWavEncoder().catch((err) =>
      console.error("Encoder registration failed:", err)
    );

    fetch(`${API_HOST}/mode`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID || "",
        "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET || "",
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
      })
      .then((data) => {
        setMode(data.mode);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    console.log("Recording state updated:", isRecording);
  }, [isRecording]);

  const appendMessage = (message: { text: string; sender: "bot" | "user" }) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const replaceLastBotMessage = (text: string) => {
    setMessages((prevMessages) => [
      ...prevMessages.slice(0, prevMessages.length - 1),
      { sender: "bot", text },
    ]);
  };

  const appendUserMessage = (text: string) => {
    appendMessage({
      text,
      sender: "user",
    });
  };

  const startRecordingAudio = async () => {
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

  const stopRecordingAudio = (): Promise<Blob | null> =>
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

  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);

      try {
        const audioBlob = await stopRecordingAudio();
        if (!audioBlob) throw new Error("Recording failed to produce a blob.");

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.wav");

        const response = await fetch(`${API_HOST}/generate/voice`, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
            "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID || "",
            "CF-Access-Client-Secret":
              import.meta.env.VITE_CF_CLIENT_SECRET || "",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const transcription = result.response;

        if (transcription && transcription.trim()) {
          appendMessage({ text: transcription, sender: "bot" });
        }
      } catch (error) {
        console.error("Error processing audio:", error);
        replaceLastBotMessage("Error: Could not process audio recording.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsRecording(true);
      await startRecordingAudio();
    }
  };

  const streamPromptResponse = async (
    prompt: string,
    setMessages: Dispatch<
      SetStateAction<{ text: string; sender: "user" | "bot" }[]>
    >,
    setIsLoading: Dispatch<SetStateAction<boolean>>
  ): Promise<string> => {
    let replyData = "";
    try {
      const response = await fetch(`${API_HOST}/generate/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID || "",
          "CF-Access-Client-Secret":
            import.meta.env.VITE_CF_CLIENT_SECRET || "",
        },
        body: JSON.stringify({
          frontendTools: getPromptWithTools(),
          prompt: prompt,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error("No reader available");
      }
      let isFirstChunk = true;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream ended");
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        lines.forEach((line: string) => {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data.trim()) {
              console.log("Received chunk:", data);
              replyData += data;
              if (isFirstChunk) {
                isFirstChunk = false;
                setIsLoading(false);
                setMessages((prevMessages) => [
                  ...prevMessages,
                  { sender: "bot", text: replyData },
                ]);
              } else {
                setMessages((prevMessages) => [
                  ...prevMessages.slice(0, prevMessages.length - 1),
                  { sender: "bot", text: replyData },
                ]);
              }
            }
          }
        });
      }
    } catch (error: unknown) {
      console.error("Error:", error);
    }
    return replyData;
  };

  const processToolCallMessages = (
    response: string
  ): [string | null, string] => {
    const parsedResponse = JSON.parse(response);
    console.log(`Found tool call: ${parsedResponse}`);
    const toolCallResult = executeToolCall(
      parsedResponse["name"],
      parsedResponse["parameters"]
    );
    console.log(`Tool call result: ${toolCallResult}`);
    return [toolCallResult, parsedResponse["name"]];
  };

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      appendUserMessage(inputValue);
      setInputValue("");
      setIsLoading(true);
      try {
        const replyData = await streamPromptResponse(
          inputValue,
          setMessages,
          setIsLoading
        );
        try {
          const [toolCallResult, toolName] = processToolCallMessages(replyData);
          if (toolCallResult !== null) {
            if (toolCallResult !== "") {
              replaceLastBotMessage(toolCallResult);
            } else {
              replaceLastBotMessage(`Ok, executing tool: ${toolName}`);
            }
          } else {
            throw new Error("Failed tool call!");
          }
        } catch (error) {
          console.log(error);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        replaceLastBotMessage("Error: Could not get a response from the bot.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const toggleMode = async () => {
    const newMode = mode === "text" ? "voice" : "text";
    setMode((prevMode) => (prevMode === "text" ? "voice" : "text"));

    const response = await fetch(`${API_HOST}/mode/switch?mode=${newMode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID || "",
        "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET || "",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <div className="chatbot-header-title">ResQTalk</div>
        <ModeToggle mode={mode} toggleMode={toggleMode} />
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message-container ${message.sender}`}>
            {message.sender === "bot" && <div className="avatar bot">B</div>}
            <div className={`chatbot-message ${message.sender}`}>
              {message.sender === "bot" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              ) : (
                message.text
              )}
            </div>
            {message.sender === "user" && <div className="avatar user">U</div>}
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="message-container bot">
            <div className="avatar bot">B</div>
            <div className="chatbot-message bot thinking-message">
              Thinking...
            </div>
          </div>
        )}
      </div>
      <form
        className="chatbot-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          className="chatbot-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="How can I help you in this disaster situation?"
          disabled={isLoading || mode === "voice"}
        />
        {mode === "voice" && (
          <button
            type="button"
            className={`chatbot-button ${isRecording ? "recording" : ""}`}
            onClick={handleToggleRecording}
            disabled={isLoading && !isRecording}
          >
            {isRecording ? "Stop" : "Record"}
          </button>
        )}
        {mode === "text" && (
          <button type="submit" className="chatbot-button" disabled={isLoading}>
            Send
          </button>
        )}
      </form>
    </div>
  );
};

export default Chatbot;
