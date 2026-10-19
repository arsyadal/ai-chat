import React, { useState, useEffect } from 'react';
import { 
  User, 
  Sparkles, 
  Brain, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { marked } from 'marked';
import prism from 'prismjs';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  onRetry?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry }) => {
  const isUser = message.role === 'user';
  const [showThought, setShowThought] = useState(true);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }, []);

  useEffect(() => {
    try {
      prism.highlightAll();
    } catch (e) {}
  }, [message.content, message.thought]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const renderFormattedMarkdown = (content: string) => {
    if (!content) return null;
    try {
      const rawHtml = marked.parse(content) as string;
      return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: rawHtml }} />;
    } catch (e) {
      return <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>;
    }
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      <div className="message-content-box">
        {/* Avatar */}
        <div className={`avatar ${isUser ? 'user' : 'ai'}`}>
          {isUser ? <User size={18} /> : <Sparkles size={18} />}
        </div>

        {/* Message Body */}
        <div className="message-body">
          {/* Header */}
          <div className="message-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="author-name">{isUser ? 'You' : 'Meta Muse Spark 1.1'}</span>
              {message.reasoningEffort && !isUser && (
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139,92,246,0.15)', color: '#c084fc', border: '1px solid rgba(139,92,246,0.3)' }}>
                  effort: {message.reasoningEffort}
                </span>
              )}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <button
              onClick={handleCopyMessage}
              className="btn-icon"
              style={{ width: '28px', height: '28px' }}
              title="Copy response"
            >
              {copiedMessage ? <Check size={14} style={{ color: 'var(--primary-emerald)' }} /> : <Copy size={14} />}
            </button>
          </div>

          {/* Thought Dropdown */}
          {message.thought && !isUser && (
            <div className="reasoning-box">
              <button
                onClick={() => setShowThought(!showThought)}
                className="reasoning-header"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={15} style={{ color: '#c084fc' }} />
                  <span>Reasoning Process</span>
                  {message.isStreaming && !message.content && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(139,92,246,0.25)', padding: '1px 6px', borderRadius: '4px' }}>
                      Thinking...
                    </span>
                  )}
                </div>
                {showThought ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showThought && (
                <div className="reasoning-content">
                  {message.thought}
                </div>
              )}
            </div>
          )}

          {/* Main Content */}
          {message.error ? (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{message.error}</div>
              {onRetry && (
                <button onClick={onRetry} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                  <RefreshCw size={12} /> Retry
                </button>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-main)' }}>
              {renderFormattedMarkdown(message.content)}
              {message.isStreaming && !message.content && !message.thought && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--primary-purple)', padding: '6px 0' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-purple)', animation: 'pulseGlow 1.2s infinite' }} />
                  <span>Generating response...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
