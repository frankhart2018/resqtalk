import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Chatbot.css';
import ThemeToggle from './ThemeToggle';
import { executeToolCall, getPromptWithTools } from '../tools/tool-utils';
import { getLocation, LOCATION_RESULT } from '../tools/location-tools';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      setMessages([...messages, { text: inputValue, sender: 'user' }]);
      setInputValue('');
      setIsLoading(true);
      try {
        const promptString = `${getPromptWithTools()}\n\n${inputValue}`;
        const apiHost = import.meta.env.VITE_API_HOST || `http://${window.location.hostname}:8000`;
        const response = await axios.post(`${apiHost}/prompt`, { prompt: promptString });
        console.log(promptString);
        console.log(response.data);
        const promptId = response.data.promptId;
        getLocation();
        console.log(LOCATION_RESULT.result);

        try {
          const parsedResponse = JSON.parse(response.data.response);
          console.log(`Found tool call: ${parsedResponse}`);
          const toolCallResult = executeToolCall(parsedResponse['name'], parsedResponse['parameters']);
          console.log(`Tool call result: ${toolCallResult}`);
          if (toolCallResult !== null) {
            if (toolCallResult !== "") {
              setMessages(prevMessages => [...prevMessages, { text: toolCallResult, sender: 'bot' }]);
              await axios.patch(`${apiHost}/tool-call/${promptId}`, { result: toolCallResult });
            } else {
              setMessages(prevMessages => [...prevMessages, { text: `Ok, executing tool: ${parsedResponse['name']}`, sender: 'bot' }]);
            }
          } else {
            throw new Error("Failed tool call!")
          }
        } catch {
          setMessages(prevMessages => [...prevMessages, { text: response.data.response, sender: 'bot' }]);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prevMessages => [...prevMessages, { text: 'Error: Could not get a response from the bot.', sender: 'bot' }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
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
            {message.sender === 'bot' && <div className="avatar bot">B</div>}
            <div className={`chatbot-message ${message.sender}`}>
              {message.sender === 'bot' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
              ) : (
                message.text
              )}
            </div>
            {message.sender === 'user' && <div className="avatar user">U</div>}
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
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          className="chatbot-input"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="How can I help you in this disaster situation?"
          disabled={isLoading}
        />
        <button type="submit" className="chatbot-button"
          disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
