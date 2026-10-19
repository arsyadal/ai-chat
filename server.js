import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import { URL } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    endpoint: 'https://api.meta.ai/v1/responses',
    defaultModel: 'muse-spark-1.1',
    hasApiKey: Boolean(process.env.MODEL_API_KEY),
  });
});

// Proxy Chat Endpoint for Meta Muse API
app.post('/api/chat', async (req, res) => {
  const {
    model = 'muse-spark-1.1',
    input = [],
    stream = true,
    temperature = 1,
    max_output_tokens = 32000,
    top_p = 1,
    reasoning = { effort: 'medium' },
    apiKey: customApiKey,
  } = req.body;

  const apiKey = customApiKey || process.env.MODEL_API_KEY;

  // Set SSE headers for streaming back to frontend client
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const cleanKey = (apiKey || '').trim();
  const isClaude = cleanKey.startsWith('sk-ant-') || model.startsWith('claude');
  const isGroq = cleanKey.startsWith('gsk_');
  const isOpenRouter = cleanKey.startsWith('sk-or-');
  const isGeminiOAuth = cleanKey.startsWith('AQ');
  const isGeminiApiKey = cleanKey.startsWith('AIza');
  const isGemini = isGeminiOAuth || isGeminiApiKey || model.startsWith('gemini');

  let targetUrl = 'https://api.meta.ai/v1/responses';
  let reqBodyPayload;

  if (isClaude) {
    targetUrl = 'https://api.anthropic.com/v1/messages';

    const systemMsgs = input
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversation = input
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content || '',
      }));

    // Standardize & merge consecutive messages with same role for Anthropic schema
    const formattedMsgs = [];
    for (const msg of conversation) {
      if (formattedMsgs.length > 0 && formattedMsgs[formattedMsgs.length - 1].role === msg.role) {
        formattedMsgs[formattedMsgs.length - 1].content += '\n\n' + msg.content;
      } else {
        formattedMsgs.push({ role: msg.role, content: msg.content });
      }
    }

    const claudeModel = model.startsWith('claude') ? model : 'claude-3-7-sonnet-20250219';
    let maxTokens = Number(max_output_tokens) || 4096;
    if (maxTokens > 64000) maxTokens = 64000;

    reqBodyPayload = {
      model: claudeModel,
      messages: formattedMsgs.length > 0 ? formattedMsgs : [{ role: 'user', content: 'Hello' }],
      max_tokens: maxTokens,
      stream: true,
    };

    if (systemMsgs) {
      reqBodyPayload.system = systemMsgs;
    }

    if (claudeModel === 'claude-3-7-sonnet-20250219' && reasoning?.effort && reasoning.effort !== 'none') {
      const budgetMap = { low: 2048, medium: 4096, high: 16384 };
      const budget = budgetMap[reasoning.effort] || 4096;
      reqBodyPayload.thinking = {
        type: 'enabled',
        budget_tokens: budget,
      };
      if (reqBodyPayload.max_tokens <= budget) {
        reqBodyPayload.max_tokens = budget + 4096;
      }
    } else {
      reqBodyPayload.temperature = Number(temperature);
    }
  } else if (isGemini) {
    if (isGeminiOAuth) {
      // OAuth 2 Token format (AQ...) -> Authorization: Bearer AQ... header, no ?key= in URL
      targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse`;
    } else {
      // API Key format (AIza...) -> ?key=AIza... query param in URL
      targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${cleanKey}&alt=sse`;
    }

    const geminiContents = input.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    reqBodyPayload = {
      contents: geminiContents,
      generationConfig: {
        temperature: Number(temperature),
        maxOutputTokens: Number(max_output_tokens) > 8192 ? 8192 : Number(max_output_tokens),
        topP: Number(top_p),
      },
    };
  } else if (isGroq) {
    targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const groqModel = model.includes('70b') ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
    reqBodyPayload = {
      model: groqModel,
      messages: input,
      stream: true,
      temperature: Number(temperature),
      max_tokens: Number(max_output_tokens) > 8192 ? 8192 : Number(max_output_tokens),
      top_p: Number(top_p),
    };
  } else if (isOpenRouter) {
    targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
    reqBodyPayload = {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: input,
      stream: true,
      temperature: Number(temperature),
      max_tokens: Number(max_output_tokens),
      top_p: Number(top_p),
    };
  } else {
    reqBodyPayload = {
      model,
      input,
      stream,
      temperature: Number(temperature),
      max_output_tokens: Number(max_output_tokens),
      top_p: Number(top_p),
      reasoning,
    };
  }

  // Helper to emit SSE chunk to client
  const sendChunk = (dataObj) => {
    res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
  };

  // If no API key provided or explicitly using mock mode
  if (!cleanKey || cleanKey === 'MOCK_KEY') {
    return runMockStream(model, input, reasoning, sendChunk, res);
  }

  try {
    const payload = JSON.stringify(reqBodyPayload);
    const parsedUrl = new URL(targetUrl);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Content-Length': Buffer.byteLength(payload),
    };

    if (isClaude) {
      headers['x-api-key'] = cleanKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (isGeminiOAuth || !isGemini) {
      headers['Authorization'] = `Bearer ${cleanKey}`;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers,
    };

    const apiReq = https.request(options, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        let errBody = '';
        apiRes.on('data', (chunk) => { errBody += chunk; });
        apiRes.on('end', () => {
          console.error(`Meta AI API Error [${apiRes.statusCode}]:`, errBody);
          let friendlyNotice = `[API Error ${apiRes.statusCode}] `;
          if (apiRes.statusCode === 401) {
            friendlyNotice += `API Key tidak valid atau telah kadaluarsa (Authentication Error 401).\n\n💡 **Tips**: Periksa kembali API Key Anda di menu Pengaturan, atau kosongkan API Key jika ingin menguji **Mode Simulasi Demo** gratis.\n\n`;
          } else if (apiRes.statusCode === 402) {
            friendlyNotice += `Akun API ini membutuhkan verifikasi metode pembayaran (Billing/Credit Card) di konsol pengembang penyedia API.\n\n💡 **Tips**: Kosongkan API Key di Pengaturan jika ingin menggunakan **Mode Simulasi Demo Gratis** tanpa bayar!\n\n`;
          } else {
            friendlyNotice += `${errBody || 'Periksa kembali API Key Anda.'}\n\n`;
          }
          
          sendChunk({
            type: 'error',
            error: `API Status ${apiRes.statusCode}: ${errBody}`,
          });
          runMockStream(model, input, reasoning, sendChunk, res, friendlyNotice);
        });
        return;
      }

      let buffer = '';
      apiRes.on('data', (chunk) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6);
            if (rawData === '[DONE]') {
              sendChunk({ type: 'done' });
              return res.end();
            }
            try {
              const json = JSON.parse(rawData);
              if (json.type === 'message_stop') {
                sendChunk({ type: 'done' });
                return res.end();
              }

              const textContent =
                json.candidates?.[0]?.content?.parts?.[0]?.text ||
                json.choices?.[0]?.delta?.content ||
                json.delta?.content ||
                json.delta?.text ||
                (json.delta?.type === 'text_delta' ? json.delta.text : undefined);

              const reasoningContent =
                json.choices?.[0]?.delta?.reasoning ||
                json.delta?.reasoning ||
                json.delta?.thinking ||
                (json.delta?.type === 'thinking_delta' ? json.delta.thinking : undefined);

              if (textContent) {
                sendChunk({ type: 'text', text: textContent });
              } else if (reasoningContent) {
                sendChunk({ type: 'thought', text: reasoningContent });
              } else {
                sendChunk({ type: 'delta', delta: json });
              }
            } catch (e) {
              sendChunk({ type: 'text', text: rawData });
            }
          }
        }
      });

      apiRes.on('end', () => {
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6);
            try {
              sendChunk({ type: 'delta', delta: JSON.parse(rawData) });
            } catch (e) {
              sendChunk({ type: 'text', text: rawData });
            }
          }
        }
        sendChunk({ type: 'done' });
        res.end();
      });
    });

    apiReq.on('error', (err) => {
      console.error('HTTPS Request Error:', err.message);
      sendChunk({ type: 'error', error: `Network error: ${err.message}` });
      runMockStream(model, input, reasoning, sendChunk, res, `[Network fallback mode]\n\n`);
    });

    apiReq.write(payload);
    apiReq.end();
  } catch (err) {
    console.error('Server exception:', err);
    sendChunk({ type: 'error', error: err.message });
    res.end();
  }
});

// Interactive Intelligent Stream Generator for demo & offline testing
function runMockStream(model, input, reasoning, sendChunk, res, prefix = '') {
  const lastUserMsg = [...input].reverse().find((m) => m.role === 'user')?.content || 'Hello';
  const effort = reasoning?.effort || 'medium';
  const lowerMsg = lastUserMsg.toLowerCase().trim();

  // Dynamic Thought steps based on query
  const thoughts = [
    `Analyzing query: "${lastUserMsg.slice(0, 45)}..."`,
    `Evaluating user intent & contextual memory (${input.length} messages in context)`,
    `Executing reasoning chain with effort level: ${effort}...`,
  ];

  let thoughtIndex = 0;
  sendChunk({ type: 'thought_start' });
  
  const thoughtInterval = setInterval(() => {
    if (thoughtIndex < thoughts.length) {
      sendChunk({ type: 'thought', text: thoughts[thoughtIndex] + '\n' });
      thoughtIndex++;
    } else {
      clearInterval(thoughtInterval);
      sendChunk({ type: 'thought_end' });

      // Generate dynamic response text based on user prompt
      let responseText = '';

      if (lowerMsg.includes('siapa saya') || lowerMsg.includes('who am i')) {
        responseText = `${prefix}Anda adalah pengguna (*user*) yang sedang berinteraksi dengan aplikasi **Meta Muse Spark 1.1 Studio** ini! 

Saya adalah asisten kecerdasan buatan (AI) Anda. Anda dapat mengajukan pertanyaan, meminta bantuan pemrograman, analisis logika, atau pembuatan dokumen. Ada yang ingin kita diskusikan hari ini?`;
      } else if (lowerMsg.includes('siapa kamu') || lowerMsg.includes('who are you') || lowerMsg.includes('apa ini')) {
        responseText = `${prefix}Saya adalah **Meta Muse Spark 1.1**, model kecerdasan buatan generatif dengan kemampuan penalaran (*reasoning*) tingkat lanjut.

**Spesifikasi Sesi Saat Ini:**
- **Model**: \`${model}\`
- **Reasoning Effort**: \`${effort}\`
- **Streaming Protocol**: \`text/event-stream\` (SSE)

Ada yang bisa saya bantu untuk Anda?`;
      } else if (lowerMsg.includes('code') || lowerMsg.includes('python') || lowerMsg.includes('curl') || lowerMsg.includes('api')) {
        responseText = `${prefix}Berikut adalah contoh skrip integrasi endpoint Meta AI (\`https://api.meta.ai/v1/responses\`):

\`\`\`python
import os
import requests

api_key = os.environ.get("MODEL_API_KEY", "your_api_key_here")
url = "https://api.meta.ai/v1/responses"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
}

payload = {
    "model": "${model}",
    "input": [{"role": "user", "content": "${lastUserMsg.replace(/"/g, '\\"')}"}],
    "stream": True,
    "temperature": 1,
    "max_output_tokens": 32000,
    "top_p": 1,
    "reasoning": {"effort": "${effort}"}
}

response = requests.post(url, headers=headers, json=payload, stream=True)
for line in response.iter_lines():
    if line and line.decode("utf-8").startswith("data: "):
        print(line.decode("utf-8")[6:], end="", flush=True)
\`\`\``;
      } else {
        responseText = `${prefix}Terima kasih atas pertanyaannya: **"${lastUserMsg}"**.

Sebagai **Meta Muse Spark 1.1** (Reasoning Effort: \`${effort}\`), saya telah menganalisis permintaan Anda. 

Apakah ada instruksi spesifik atau bantuan tambahan yang Anda perlukan terkait hal ini?`;
      }

      let charIndex = 0;
      const streamInterval = setInterval(() => {
        if (charIndex < responseText.length) {
          const chunk = responseText.slice(charIndex, charIndex + 8);
          charIndex += 8;
          sendChunk({ type: 'text', text: chunk });
        } else {
          clearInterval(streamInterval);
          sendChunk({ type: 'done' });
          res.end();
        }
      }, 20);
    }
  }, 350);
}

app.listen(PORT, () => {
  console.log(`⚡ Meta Muse AI API Proxy running on http://localhost:${PORT}`);
  console.log(`   Target Endpoint: https://api.meta.ai/v1/responses`);
});
