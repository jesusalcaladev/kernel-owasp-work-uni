// src/api.js
// Cliente LLM. Usa el SDK oficial de OpenAI contra el endpoint
// OpenAI-compatible de OpenRouter. Cae a MOCK si no hay API key.
//
// Por qué OpenAI SDK + OpenRouter:
//   * OpenRouter expone `/chat/completions` con contrato idéntico a OpenAI
//     (`baseURL=https://openrouter.ai/api/v1` + headers `HTTP-Referer` y
//     `X-Title` nos identifican como el demo).
//   * El SDK nos da streaming, manejo de errores tipados (AuthenticationError,
//     RateLimitError, etc.), y retry automático sin reinventar la rueda.

import 'dotenv/config';
import OpenAI from 'openai';

const OPENAI_COMPAT_URL = 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL || 'cognitivecomputations/dolphin3.0-mistral-24b:free';

const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
export const isMockMode = !apiKey || apiKey.startsWith('sk-or-v1-xxxxxxxx');

// Fallback: si la API real falla, caemos a MOCK automáticamente
let _apiFailed = false;

let _client = null;

/**
 * Devuelve un cliente OpenAI singleton. Lazy-init porque en CI / demo
 * sin key, no queremos gastar el handshake al cargar el módulo.
 */
function client() {
  if (_client) return _client;
  _client = new OpenAI({
    apiKey,
    baseURL: OPENAI_COMPAT_URL,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost/owasp-demo',
      'X-Title': 'owasp-demo',
    },
  });
  return _client;
}

/**
 * Prepara mensajes con contexto opcional.
 */
function buildMessages(messages, context) {
  return context
    ? [
        {
          role: 'system',
          content:
            'Usa el siguiente CONTEXTO si responde a la pregunta del usuario. ' +
            'Si no es relevante, ignóralo:\n\n' + context,
        },
        ...messages,
      ]
    : messages;
}

/**
 * Envía un prompt al modelo y devuelve la respuesta completa.
 */
export async function chat(messages, context = '') {
  const fullMessages = buildMessages(messages, context);
  if (isMockMode || _apiFailed) return mockChat(fullMessages, context);

  try {
    const res = await client().chat.completions.create(
      {
        model: MODEL,
        messages: fullMessages,
        max_completion_tokens: 500,
      },
      { signal: AbortSignal.timeout(20_000) }
    );
    return res.choices?.[0]?.message?.content?.trim() || '(sin respuesta)';
  } catch (e) {
    _apiFailed = true;
    console.log('[API] LLM no disponible, usando modo MOCK automático.');
    return mockChat(fullMessages, context);
  }
}

/**
 * Envía un prompt con streaming: cada token se pasa a onToken().
 * Devuelve el texto completo al terminar.
 */
export async function chatStream(messages, context, onToken) {
  const fullMessages = buildMessages(messages, context);
  if (isMockMode || _apiFailed) {
    const full = mockChat(fullMessages, context);
    // Simular streaming: mostrar el mock token por token
    for (let i = 0; i < full.length; i += 3) {
      onToken(full.slice(i, i + 3));
      await new Promise(r => setTimeout(r, 15));
    }
    return full;
  }

  try {
    const stream = await client().chat.completions.create({
      model: MODEL,
      messages: fullMessages,
      max_completion_tokens: 500,
      stream: true,
    });

    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        full += delta;
        onToken(delta);
      }
    }
    return full.trim() || '(sin respuesta)';
  } catch (e) {
    _apiFailed = true;
    console.log('[API] LLM no disponible, usando modo MOCK automático.');
    const full = mockChat(fullMessages, context);
    for (let i = 0; i < full.length; i += 3) {
      onToken(full.slice(i, i + 3));
      await new Promise(r => setTimeout(r, 15));
    }
    return full;
  }
}

/** Respuesta simulada determinista para demos sin red. */
function mockChat(messages, context) {
  const last = messages.at(-1)?.content || '';
  if (context) {
    return (
      `[MOCK] He recibido contexto adicional (${context.length} caracteres). ` +
      `Primer extracto relevante:\n` +
      `${context.slice(0, 280).replace(/\s+/g, ' ')}...\n\n` +
      `Tu pregunta era: "${last.slice(0, 80)}"`
    );
  }
  return `[MOCK] Respuesta simulada para: "${last.slice(0, 80)}"` +
    (last.length > 80 ? '…' : '');
}
