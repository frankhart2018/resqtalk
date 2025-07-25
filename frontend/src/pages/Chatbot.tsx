import React, { useState, useRef, useEffect, type JSX } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Chatbot.css";
import Navbar from "../components/Navbar";
import ModeToggle from "../components/ModeToggle";
import { useTheme } from "../contexts/useTheme";
import { executeToolCall } from "../tools/tool-utils";
import { register } from "extendable-media-recorder";
import { connect } from "extendable-media-recorder-wav-encoder";
import {
  getCurrentMode,
  getTextModeResponse,
  getVoiceModeResponse,
  switchMode,
} from "../api/api";
import type {
  GetCurrentModeResponse,
} from "../api/model";
import {
  startRecordingAudio,
  stopRecordingAudio,
} from "../utils/recording-utils";
import { textResponseIteratorCleaner } from "../utils/stream-iterator";
import SpeakerIcon from "../components/SpeakerIcon";
import { playSpeech } from "../utils/tts-utils";

let encoderRegistered = false;

const registerWavEncoder = async () => {
  if (!encoderRegistered) {
    await register(await connect());
    encoderRegistered = true;
    console.log("WAV encoder registered.");
  }
};

const Chatbot: React.FC = () => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<
    { text: string | JSX.Element; sender: "user" | "bot" }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState("text");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  /////////////////////////////////////////////////////////////////
  // STATE CHANGE PROCESSORS
  ////////////////////////////////////////////////////////////////
  useEffect(() => {
    registerWavEncoder().catch((err) =>
      console.error("Encoder registration failed:", err)
    );

    getCurrentMode().then((data: GetCurrentModeResponse) => {
      setMode(data.mode);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    console.log("Recording state updated:", isRecording);
  }, [isRecording]);

  /////////////////////////////////////////////////////////////////
  // MESSAGE HELPERS
  /////////////////////////////////////////////////////////////////
  const appendMessage = (message: {
    text: string | JSX.Element;
    sender: "bot" | "user";
  }) => {
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

  const appendBotMessage = (text: string) => {
    appendMessage({
      text,
      sender: "bot",
    });
  };

  /////////////////////////////////////////////////////////////////
  // MODEL CALLING HELPERS
  /////////////////////////////////////////////////////////////////
  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);

      try {
        const audioBlob = await stopRecordingAudio();
        if (!audioBlob) throw new Error("Recording failed to produce a blob.");
        appendMessage({
          text: <audio controls src={URL.createObjectURL(audioBlob)}></audio>,
          sender: "user",
        });

        const transcription = (await getVoiceModeResponse(audioBlob)).response;

        if (transcription && transcription.trim()) {
          appendBotMessage(transcription);
        }
      } catch (error) {
        console.error("Error processing audio:", error);
        appendBotMessage("Error: Could not process audio recording.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsRecording(true);
      await startRecordingAudio();
    }
  };

  const streamPromptResponse = async (prompt: string): Promise<string> => {
    let replyData = "";
    try {
      const reader = await getTextModeResponse(prompt);
      if (!reader) {
        throw new Error("No reader available");
      }

      for await (const data of textResponseIteratorCleaner(reader)) {
        replyData += data.text;
        if (data.isFirstChunk) {
          setIsLoading(false);
          appendBotMessage(replyData);
        } else {
          replaceLastBotMessage(replyData);
        }
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
        const replyData = await streamPromptResponse(inputValue);
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

  /////////////////////////////////////////////////////////////////
  // TOGGLE HANDLERS
  /////////////////////////////////////////////////////////////////
  const toggleMode = async () => {
    const newMode = mode === "text" ? "voice" : "text";
    setMode((prevMode) => (prevMode === "text" ? "voice" : "text"));

    switchMode(newMode);
  };

  /////////////////////////////////////////////////////////////////
  // JSX
  /////////////////////////////////////////////////////////////////
  return (
    <div className={`chatbot ${theme}`}>
      <Navbar pageTitle="Chat" />
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message-container ${message.sender}`}>
            {message.sender === "bot" && <div className="avatar bot">B</div>}
            {message.sender === "bot" ? (
              <div className="bot-message-content">
                <div className={`chatbot-message ${message.sender}`}>
                  {typeof message.text === "string" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    message.text
                  )}
                </div>
                {typeof message.text === "string" && (
                  <button
                    className="speaker-button"
                    onClick={() => playSpeech(message.text as string)}
                  >
                    <SpeakerIcon />
                  </button>
                )}
              </div>
            ) : (
              <div className={`chatbot-message ${message.sender}`}>
                {typeof message.text === "string" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.text}
                  </ReactMarkdown>
                ) : (
                  message.text
                )}
              </div>
            )}
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
        <ModeToggle mode={mode} toggleMode={toggleMode} />
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
