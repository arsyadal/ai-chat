import { AppSettings, Message } from '../types';

export interface StreamHandlers {
  onThoughtStart?: () => void;
  onThoughtChunk?: (chunk: string) => void;
  onThoughtEnd?: () => void;
  onTextChunk?: (chunk: string) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

export async function sendChatMessage(
  messages: Message[],
  settings: AppSettings,
  handlers: StreamHandlers
) {
  // Format input according to Meta API schema: array of prompt objects
  const input = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const payload = {
    model: settings.model || 'muse-spark-1.1',
    input,
    stream: true,
    temperature: settings.temperature,
    max_output_tokens: settings.maxOutputTokens,
    top_p: settings.topP,
    reasoning: {
      effort: settings.reasoningEffort,
    },
    apiKey: settings.apiKey,
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      handlers.onError?.(`HTTP ${response.status}: ${errText}`);
      handlers.onDone?.();
      return;
    }

    if (!response.body) {
      handlers.onError?.('No response body received.');
      handlers.onDone?.();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data: ')) {
          const rawData = trimmed.slice(6);
          if (rawData === '[DONE]') {
            handlers.onDone?.();
            return;
          }

          try {
            const event = JSON.parse(rawData);

            switch (event.type) {
              case 'thought_start':
                handlers.onThoughtStart?.();
                break;
              case 'thought':
                handlers.onThoughtChunk?.(event.text || '');
                break;
              case 'thought_end':
                handlers.onThoughtEnd?.();
                break;
              case 'text':
                handlers.onTextChunk?.(event.text || '');
                break;
              case 'delta':
                // Parse standard Meta delta schema if present
                if (event.delta?.content) {
                  handlers.onTextChunk?.(event.delta.content);
                } else if (event.delta?.reasoning) {
                  handlers.onThoughtChunk?.(event.delta.reasoning);
                }
                break;
              case 'error':
                handlers.onError?.(event.error || 'API streaming error occurred');
                break;
              case 'done':
                handlers.onDone?.();
                return;
            }
          } catch (e) {
            // Fallback plain text stream
            handlers.onTextChunk?.(rawData);
          }
        }
      }
    }

    handlers.onDone?.();
  } catch (err: any) {
    handlers.onError?.(err.message || 'Failed to connect to proxy backend server.');
    handlers.onDone?.();
  }
}
