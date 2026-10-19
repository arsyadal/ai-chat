export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  timestamp: number;
  isStreaming?: boolean;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  reasoningEffort: ReasoningEffort;
  systemPrompt: string;
}

export const AVAILABLE_MODELS = [
  { id: 'claude-3-7-sonnet-20250219', name: 'Anthropic Claude 3.7 Sonnet', description: 'Flagship hybrid reasoning model with extended thinking (sk-ant-...)' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Anthropic Claude 3.5 Sonnet', description: 'Industry-leading coding & intelligence model' },
  { id: 'claude-3-5-haiku-20241022', name: 'Anthropic Claude 3.5 Haiku', description: 'Ultra-fast, compact Anthropic model' },
  { id: 'gemini-1.5-flash', name: 'Google Gemini 1.5 Flash (Free API)', description: 'Auto-detected when Google API Key (AQ... / AIza...) is pasted' },
  { id: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B (Free Ultra Fast)', description: 'Auto-detected when Groq API Key (gsk_...) is pasted' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'OpenRouter Llama 3.3 70B Free', description: 'Auto-detected when OpenRouter Key (sk-or-...) is pasted' },
  { id: 'muse-spark-1.1', name: 'Meta Muse Spark 1.1', description: 'Flagship reasoning & creative generation model' },
  { id: 'muse-spark-1.0', name: 'Meta Muse Spark 1.0', description: 'Fast, efficient multimodal assistant' },
];

export function getProviderInfo(apiKey: string, selectedModel?: string) {
  const cleanKey = (apiKey || '').trim();
  if (cleanKey.startsWith('sk-ant-') || (selectedModel && selectedModel.startsWith('claude'))) {
    let modelName = 'Claude 3.7 Sonnet';
    if (selectedModel?.includes('3-5-haiku') || selectedModel?.includes('haiku')) modelName = 'Claude 3.5 Haiku';
    else if (selectedModel?.includes('3-5-sonnet')) modelName = 'Claude 3.5 Sonnet';
    
    return {
      provider: 'Anthropic Claude',
      modelName: modelName,
      modelId: selectedModel && selectedModel.startsWith('claude') ? selectedModel : 'claude-3-7-sonnet-20250219',
      endpoint: 'api.anthropic.com/v1/messages',
      badgeColor: '#f97316',
      badgeBg: 'rgba(249, 115, 22, 0.15)',
      badgeBorder: 'rgba(249, 115, 22, 0.3)',
      isFree: false,
    };
  }
  if (cleanKey.startsWith('AQ.') || cleanKey.startsWith('AIza')) {
    return {
      provider: 'Google Gemini',
      modelName: 'Google Gemini 1.5 Flash',
      modelId: 'gemini-1.5-flash',
      endpoint: 'generativelanguage.googleapis.com',
      badgeColor: '#3b82f6',
      badgeBg: 'rgba(59, 130, 246, 0.15)',
      badgeBorder: 'rgba(59, 130, 246, 0.3)',
      isFree: true,
    };
  }
  if (cleanKey.startsWith('gsk_')) {
    return {
      provider: 'Groq Cloud',
      modelName: 'Groq Llama 3.3 70B Versatile',
      modelId: 'llama-3.3-70b-versatile',
      endpoint: 'api.groq.com/openai/v1',
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeBorder: 'rgba(245, 158, 11, 0.3)',
      isFree: true,
    };
  }
  if (cleanKey.startsWith('sk-or-')) {
    return {
      provider: 'OpenRouter Free',
      modelName: 'Llama 3.3 70B Free',
      modelId: 'meta-llama/llama-3.3-70b-instruct:free',
      endpoint: 'openrouter.ai/api/v1',
      badgeColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeBorder: 'rgba(16, 185, 129, 0.3)',
      isFree: true,
    };
  }
  return {
    provider: 'Meta AI',
    modelName: selectedModel && selectedModel !== 'gemini-1.5-flash' ? selectedModel : 'Meta Muse Spark 1.1',
    modelId: selectedModel || 'muse-spark-1.1',
    endpoint: 'api.meta.ai/v1/responses',
    badgeColor: '#c084fc',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    badgeBorder: 'rgba(139, 92, 246, 0.3)',
    isFree: false,
  };
}
