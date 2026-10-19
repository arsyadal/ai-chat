import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  Sliders, 
  Eye, 
  EyeOff, 
  Brain, 
  Terminal, 
  Check,
  Zap,
  Sparkles
} from 'lucide-react';
import { AppSettings, AVAILABLE_MODELS, ReasoningEffort, getProviderInfo } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const providerInfo = getProviderInfo(formData.apiKey, formData.model);

  const handleApiKeyChange = (newKey: string) => {
    const detected = getProviderInfo(newKey, formData.model);
    setFormData({
      ...formData,
      apiKey: newKey,
      model: detected.modelId,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      model: providerInfo.modelId,
    });
    onClose();
  };

  const handleCopyCurl = () => {
    let curl = '';
    if (providerInfo.provider === 'Anthropic Claude') {
      curl = `curl -X POST https://api.anthropic.com/v1/messages \\
  -H "x-api-key: ${formData.apiKey || '$ANTHROPIC_API_KEY'}" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model":"${formData.model}","messages":[{"role":"user","content":"Hello"}],"max_tokens":4096}'`;
    } else if (providerInfo.provider === 'Google Gemini') {
      curl = `curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${formData.apiKey || '$GEMINI_API_KEY'}&alt=sse" \\
  -H "Content-Type: application/json" \\
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'`;
    } else if (providerInfo.provider === 'Groq Cloud') {
      curl = `curl -X POST https://api.groq.com/openai/v1/chat/completions \\
  -H "Authorization: Bearer ${formData.apiKey || '$GROQ_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"Hello"}]}'`;
    } else {
      curl = `curl -X POST https://api.meta.ai/v1/responses \\
  -H "Authorization: Bearer ${formData.apiKey || '$MODEL_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{"model":"${formData.model}","reasoning":{"effort":"${formData.reasoningEffort}"}}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: providerInfo.badgeBg, color: providerInfo.badgeColor }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{providerInfo.provider} Settings</span>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '12px', background: providerInfo.badgeBg, color: providerInfo.badgeColor, border: `1px solid ${providerInfo.badgeBorder}` }}>
                  Auto-Detected
                </span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                Target: {providerInfo.endpoint}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* API Key */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} style={{ color: providerInfo.badgeColor }} /> API Authorization Key
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Auto-Detects Claude / Gemini / Groq / Meta</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Paste Anthropic (sk-ant-...), Gemini (AQ... / AIza...), Groq (gsk_...), OpenRouter (sk-or-...), or Meta Key"
                className="form-input"
                style={{ paddingRight: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="btn-icon"
                style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px' }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Provider Detected Banner */}
            <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: providerInfo.badgeBg, border: `1px solid ${providerInfo.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: providerInfo.badgeColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Active Provider: {providerInfo.provider} ({providerInfo.modelName})
              </span>
              {providerInfo.isFree && (
                <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 700 }}>
                  100% FREE API
                </span>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={14} style={{ color: providerInfo.badgeColor }} /> Active Model
                </span>
              </label>
              <select
                value={providerInfo.modelId}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="form-input"
                style={{ cursor: 'pointer' }}
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={14} style={{ color: providerInfo.badgeColor }} /> Reasoning Effort
                </span>
              </label>
              <div className="effort-selector">
                {(['none', 'low', 'medium', 'high'] as ReasoningEffort[]).map((effort) => (
                  <button
                    key={effort}
                    type="button"
                    onClick={() => setFormData({ ...formData, reasoningEffort: effort })}
                    className={`effort-btn ${formData.reasoningEffort === effort ? 'active' : ''}`}
                    style={formData.reasoningEffort === effort ? { background: providerInfo.badgeColor, color: '#000' } : {}}
                  >
                    {effort}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters Sliders */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Temperature</span>
                <span style={{ color: providerInfo.badgeColor, fontFamily: 'var(--font-mono)' }}>{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                style={{ accentColor: providerInfo.badgeColor, width: '100%' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Top P</span>
                <span style={{ color: providerInfo.badgeColor, fontFamily: 'var(--font-mono)' }}>{formData.topP}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.topP}
                onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                style={{ accentColor: providerInfo.badgeColor, width: '100%' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Max Output Tokens</span>
                <span style={{ color: providerInfo.badgeColor, fontFamily: 'var(--font-mono)' }}>{formData.maxOutputTokens.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1024"
                max="64000"
                step="1024"
                value={formData.maxOutputTokens}
                onChange={(e) => setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value) })}
                style={{ accentColor: providerInfo.badgeColor, width: '100%' }}
              />
            </div>
          </div>

          {/* Curl Command Preview */}
          <div style={{ background: '#070a12', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
              <span style={{ color: providerInfo.badgeColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={12} /> {providerInfo.provider} Curl Command Preview
              </span>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
              >
                {copied ? <Check size={12} style={{ color: 'var(--primary-emerald)' }} /> : null}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{ fontSize: '0.72rem', color: '#10b981', margin: 0, padding: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{providerInfo.provider === 'Anthropic Claude'
  ? `curl -X POST https://api.anthropic.com/v1/messages -H "x-api-key: sk-ant-..." -H "anthropic-version: 2023-06-01"`
  : providerInfo.provider === 'Google Gemini'
  ? `curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=AQ...&alt=sse"`
  : providerInfo.provider === 'Groq Cloud'
  ? `curl -X POST https://api.groq.com/openai/v1/chat/completions -H "Authorization: Bearer gsk_..."`
  : `curl -X POST https://api.meta.ai/v1/responses -H "Authorization: Bearer $MODEL_API_KEY"`}
            </pre>
          </div>
        </form>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" style={{ padding: '8px 24px' }}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
