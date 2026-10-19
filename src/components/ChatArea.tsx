import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Square, 
  Sparkles, 
  Code, 
  Brain, 
  Zap, 
  Terminal, 
  Sliders
} from 'lucide-react';
import { Message, AppSettings, getProviderInfo } from '../types';
import { MessageItem } from './MessageItem';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onOpenSettings: () => void;
  settings: AppSettings;
}

const PROMPT_SUGGESTIONS = [
  {
    title: 'Test Meta AI API Payload',
    prompt: 'Show me the exact python script and curl command to send reasoning parameters to https://api.meta.ai/v1/responses',
    icon: Terminal,
  },
  {
    title: 'Reasoning & Problem Solving',
    prompt: 'Solve this algorithm step-by-step: How to detect memory leaks in a distributed system with reasoning effort high?',
    icon: Brain,
  },
  {
    title: 'Code Architecture Review',
    prompt: 'Write a TypeScript interface and SSE stream parser for Server-Sent Events in a Web App.',
    icon: Code,
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onOpenSettings,
  settings,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerInfo = getProviderInfo(settings.apiKey, settings.model);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      {/* Header Bar */}
      <div className="header-bar">
        <div className="status-badge">
          <div className="status-dot" style={{ background: providerInfo.badgeColor, boxShadow: `0 0 8px ${providerInfo.badgeColor}` }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{providerInfo.modelName}</span>
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '10px', background: providerInfo.badgeBg, color: providerInfo.badgeColor, border: `1px solid ${providerInfo.badgeBorder}` }}>
                {providerInfo.provider}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
              {providerInfo.endpoint}
            </div>
          </div>
        </div>

        <button onClick={onOpenSettings} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
          <Sliders size={14} style={{ color: 'var(--primary-purple)' }} />
          <span>Parameters</span>
        </button>
      </div>

      {/* Messages View */}
      <div className="messages-wrapper">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-hero-icon">
              <Sparkles size={36} />
            </div>

            <div>
              <h1 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                Meta Muse Spark <span className="text-gradient">1.1 Studio</span>
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto' }}>
                High-performance AI chat playground with live SSE event streaming, reasoning effort control, and customized payload parameters.
              </p>
            </div>

            <div className="prompt-cards-grid">
              {PROMPT_SUGGESTIONS.map((s, idx) => {
                const IconComponent = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(s.prompt)}
                    className="prompt-card"
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-purple)', marginBottom: '12px' }}>
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                        {s.prompt}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-area-wrapper">
        <div className="input-container-inner">
          <form onSubmit={handleSubmit} className="input-box-wrapper">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Meta Muse Spark 1.1... (Press Enter to send, Shift+Enter for newline)"
              className="chat-textarea"
            />

            <div className="send-btn-pos">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="btn"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px', background: '#e11d48', color: 'white' }}
                  title="Stop generating"
                >
                  <Square size={14} style={{ fill: 'currentColor' }} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="btn btn-primary"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }}
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </form>

          <div className="input-status-info">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={11} style={{ color: '#f59e0b' }} />
              <span>Temp: {settings.temperature}</span>
              <span>•</span>
              <span>Max Tokens: {settings.maxOutputTokens.toLocaleString()}</span>
            </span>
            <span>https://api.meta.ai/v1/responses</span>
          </div>
        </div>
      </div>
    </div>
  );
};
