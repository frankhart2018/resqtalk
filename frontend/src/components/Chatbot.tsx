import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Chatbot.css";
import ThemeToggle from "./ThemeToggle";
import { executeToolCall, getPromptWithTools } from "../tools/tool-utils";

const sendPrompt = async (apiHost: string, promptString: string) => {
  try {
    const response = await fetch(`${apiHost}/aprompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        prompt: promptString,
        frontendTools: getPromptWithTools(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to connect");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                return;
              }
              try {
                const parsed = JSON.parse(data);
                console.log(parsed);
                // setMessages((prev) => [...prev, parsed]);
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error reading stream:", error);
      }
    };

    readStream();
  } catch (error) {
    console.error("Error connecting to SSE:", error);
  }

  const response = await axios.post(`${apiHost}/prompt`, {
    prompt: promptString,
    frontendTools: getPromptWithTools(),
  });
  console.log(promptString);
  console.log(response.data);
  return response;
};

const processToolCallMessages = (response: string): [string | null, string] => {
  const parsedResponse = JSON.parse(response);
  console.log(`Found tool call: ${parsedResponse}`);

  const toolCallResult = executeToolCall(
    parsedResponse["name"],
    parsedResponse["parameters"]
  );
  console.log(`Tool call result: ${toolCallResult}`);
  return [toolCallResult, parsedResponse["name"]];
};

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "bot" }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const appendMessage = (message: { text: string; sender: "bot" | "user" }) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const appendBotMessage = (text: string) => {
    appendMessage({
      text,
      sender: "bot",
    });
  };

  const appendUserMessage = (text: string) => {
    appendMessage({
      text,
      sender: "user",
    });
  };

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      appendUserMessage(inputValue);
      setInputValue("");
      setIsLoading(true);
      try {
        const apiHost =
          import.meta.env.VITE_API_HOST ||
          `http://${window.location.hostname}:8000`;
        const response = await sendPrompt(apiHost, inputValue);
        const promptId = response.data.promptId;

        try {
          const [toolCallResult, toolName] = processToolCallMessages(
            response.data.response
          );

          if (toolCallResult !== null) {
            if (toolCallResult !== "") {
              appendBotMessage(toolCallResult);
              await axios.patch(`${apiHost}/tool-call/${promptId}`, {
                result: toolCallResult,
              });
            } else {
              appendBotMessage(`Ok, executing tool: ${toolName}`);
            }
          } else {
            throw new Error("Failed tool call!");
          }
        } catch {
          appendBotMessage(response.data.response);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        appendBotMessage("Error: Could not get a response from the bot.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <div className={`chatbot ${theme}`}>
      <div className="chatbot-header">
        <div className="chatbot-header-title">ResQTalk</div>
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
          disabled={isLoading}
        />
        <button type="submit" className="chatbot-button" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
