import { useState, useEffect, useRef } from "react";
import { Button, MaterialIcon, Spinner } from "@interviews-tracker/design-system";
import { api } from "../lib/api";
import styles from "./telegram-test-bot.module.css";

interface Message {
  role: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface TelegramTestResponse {
  success: boolean;
  intent?: {
    type: string;
    confidence: number;
    reasoning: string;
  };
  messages: Array<{
    role: "user" | "bot";
    text: string;
    timestamp: string;
  }>;
  data?: unknown;
  error?: string;
}

const STORAGE_KEY = "telegram-test-bot-messages";

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((msg: { role: string; text: string; timestamp: string }) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage errors
  }
}

function formatMarkdown(text: string): JSX.Element {
  // Enhanced markdown parser for **bold**, [text](url), and plain URLs
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Try to match **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      // Add text before match
      if (boldMatch.index > 0) {
        parts.push(remaining.substring(0, boldMatch.index));
      }
      // Add bold text
      parts.push(<strong key={`bold-${key++}`}>{boldMatch[1]}</strong>);
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Try to match [text](url) - markdown links
    const markdownLinkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (markdownLinkMatch && markdownLinkMatch.index !== undefined) {
      // Add text before match
      if (markdownLinkMatch.index > 0) {
        parts.push(remaining.substring(0, markdownLinkMatch.index));
      }
      // Add link
      parts.push(
        <a
          key={`link-${key++}`}
          href={markdownLinkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.messageLink}
        >
          {markdownLinkMatch[1]}
        </a>
      );
      remaining = remaining.substring(markdownLinkMatch.index + markdownLinkMatch[0].length);
      continue;
    }

    // Try to match plain URLs (http://, https://)
    const urlMatch = remaining.match(/(https?:\/\/[^\s)]+)/);
    if (urlMatch && urlMatch.index !== undefined) {
      // Add text before match
      if (urlMatch.index > 0) {
        parts.push(remaining.substring(0, urlMatch.index));
      }
      // Add plain URL as clickable link
      const url = urlMatch[1];
      // Shorten display text for long URLs
      const displayText = url.length > 50 ? url.substring(0, 47) + "..." : url;
      parts.push(
        <a
          key={`url-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.messageLink}
          title={url}
        >
          {displayText}
        </a>
      );
      remaining = remaining.substring(urlMatch.index + urlMatch[0].length);
      continue;
    }

    // No more matches, add remaining text
    parts.push(remaining);
    break;
  }

  return <>{parts}</>;
}

export function TelegramTestBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Auto-scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    // Optimistically show user message immediately
    const userMsg: Message = {
      role: "user",
      text: userMessage,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.telegramTest(userMessage);

      // Add only the bot responses (user message already shown)
      const botMessages: Message[] = response.messages
        .filter((msg) => msg.role === "bot")
        .map((msg) => ({
          role: msg.role,
          text: msg.text,
          timestamp: new Date(msg.timestamp)
        }));

      setMessages((prev) => [...prev, ...botMessages]);
    } catch (error) {
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `❌ Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          className={styles.floatingButton}
          onClick={() => setIsOpen(true)}
          aria-label="Open Telegram test bot"
        >
          <MaterialIcon name="chat" size={24} />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <MaterialIcon name="smart_toy" size={20} />
              <span>Telegram Bot Test</span>
            </div>
            <div className={styles.headerActions}>
              {messages.length > 0 && (
                <button
                  className={styles.iconButton}
                  onClick={handleClear}
                  aria-label="Clear messages"
                  title="Clear messages"
                >
                  <MaterialIcon name="delete" size={18} />
                </button>
              )}
              <button
                className={styles.iconButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <MaterialIcon name="chat_bubble_outline" size={48} />
                <p>Test your Telegram bot here</p>
                <p className={styles.emptyStateHint}>
                  Try creating an opportunity or asking a query
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  message.role === "user" ? styles.userMessage : styles.botMessage
                }`}
              >
                <div className={styles.messageContent}>
                  {formatMarkdown(message.text)}
                </div>
                <div className={styles.messageTimestamp}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {isLoading && (
              <div className={`${styles.message} ${styles.botMessage}`}>
                <div className={styles.messageContent}>
                  <Spinner size="small" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className={styles.inputContainer}>
            <textarea
              className={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className={styles.sendButton}
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
            >
              <MaterialIcon name="send" size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
