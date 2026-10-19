import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { AppSettings, ChatSession, Message } from './types';
import { sendChatMessage } from './services/apiService';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'muse-spark-1.1',
  temperature: 1,
  topP: 1,
  maxOutputTokens: 32000,
  reasoningEffort: 'medium',
  systemPrompt: 'You are Meta Muse Spark 1.1, an advanced AI reasoning assistant.',
};

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('meta_muse_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_SETTINGS;
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('meta_muse_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (sessions.length > 0) return sessions[0].id;
    return '';
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const activeStreamController = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('meta_muse_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('meta_muse_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;
  const currentMessages = currentSession ? currentSession.messages : [];

  const handleCreateNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: settings.model,
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(updated.length > 0 ? updated[0].id : '');
    }
  };

  const handleSendMessage = async (userText: string) => {
    let targetSessionId = currentSessionId;
    let currentSessionsList = [...sessions];

    if (!targetSessionId || !currentSessionsList.some(s => s.id === targetSessionId)) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: userText.slice(0, 30) || 'New Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: settings.model,
      };
      currentSessionsList = [newSession, ...currentSessionsList];
      targetSessionId = newSession.id;
      setSessions(currentSessionsList);
      setCurrentSessionId(targetSessionId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      thought: '',
      timestamp: Date.now(),
      isStreaming: true,
      reasoningEffort: settings.reasoningEffort,
      model: settings.model,
    };

    const updatedSessions = currentSessionsList.map((session) => {
      if (session.id === targetSessionId) {
        const title = session.messages.length === 0 ? userText.slice(0, 30) : session.title;
        return {
          ...session,
          title,
          updatedAt: Date.now(),
          messages: [...session.messages, userMessage, assistantMessage],
        };
      }
      return session;
    });

    setSessions(updatedSessions);
    setIsStreaming(true);
    activeStreamController.current = true;

    const activeSessionObj = updatedSessions.find((s) => s.id === targetSessionId);
    const historyMessages = activeSessionObj ? activeSessionObj.messages.slice(0, -1) : [userMessage];

    const updateAssistantMsg = (fn: (msg: Message) => Message) => {
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === targetSessionId) {
            const newMsgs = session.messages.map((msg) => {
              if (msg.id === assistantMessageId) {
                return fn(msg);
              }
              return msg;
            });
            return { ...session, messages: newMsgs };
          }
          return session;
        })
      );
    };

    await sendChatMessage(historyMessages, settings, {
      onThoughtChunk: (chunk) => {
        if (!activeStreamController.current) return;
        updateAssistantMsg((msg) => ({
          ...msg,
          thought: (msg.thought || '') + chunk,
        }));
      },
      onTextChunk: (chunk) => {
        if (!activeStreamController.current) return;
        updateAssistantMsg((msg) => ({
          ...msg,
          content: (msg.content || '') + chunk,
        }));
      },
      onError: (err) => {
        updateAssistantMsg((msg) => ({
          ...msg,
          error: err,
          isStreaming: false,
        }));
      },
      onDone: () => {
        updateAssistantMsg((msg) => ({
          ...msg,
          isStreaming: false,
        }));
        setIsStreaming(false);
      },
    });
  };

  const handleStopStreaming = () => {
    activeStreamController.current = false;
    setIsStreaming(false);
  };

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewSession={handleCreateNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        settings={settings}
      />

      <ChatArea
        messages={currentMessages}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        onOpenSettings={() => setIsSettingsOpen(true)}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
}
