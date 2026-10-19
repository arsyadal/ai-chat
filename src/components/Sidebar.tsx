import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings as SettingsIcon, 
  Sparkles, 
  Cpu, 
  Zap
} from 'lucide-react';
import { ChatSession, AppSettings, AVAILABLE_MODELS, getProviderInfo } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  settings: AppSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  settings,
}) => {
  const providerInfo = getProviderInfo(settings.apiKey, settings.model);

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ background: `linear-gradient(135deg, ${providerInfo.badgeColor}, #6366f1)` }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div className="logo-title">{providerInfo.provider} Studio</div>
            <div className="logo-sub">{providerInfo.endpoint}</div>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-new-chat">
        <button
          onClick={onNewSession}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px 14px' }}
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Model Indicator Card */}
      <div className="model-indicator-card" onClick={onOpenSettings} style={{ borderColor: providerInfo.badgeBorder }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <Cpu size={18} style={{ color: providerInfo.badgeColor, flexShrink: 0 }} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {providerInfo.modelName}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} style={{ color: '#f59e0b' }} />
              <span>Provider: <strong style={{ color: providerInfo.badgeColor }}>{providerInfo.provider}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="history-list">
        <div className="history-title">Conversations</div>
        {sessions.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
            No recent chats
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`history-item ${isActive ? 'active' : ''}`}
              >
                <div className="history-item-label">
                  <MessageSquare size={15} style={{ color: isActive ? 'var(--primary-purple)' : 'var(--text-subtle)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session.title || 'Untitled Session'}
                  </span>
                </div>
                <button
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="btn-icon"
                  style={{ width: '24px', height: '24px' }}
                  title="Delete chat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button
          onClick={onOpenSettings}
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
        >
          <SettingsIcon size={16} />
          <span>API & Parameters</span>
        </button>
      </div>
    </aside>
  );
};
