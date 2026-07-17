import { chat, chatStream, isMockMode } from './api.js';

/** Envía la pregunta al modelo y devuelve la respuesta completa. */
export async function askLLM(userMessage, extraContext = '') {
  const messages = [{ role: 'user', content: userMessage }];
  return chat(messages, extraContext);
}

/** Envía la pregunta con streaming: cada token se pasa a onToken(). */
export async function askLLMStream(userMessage, extraContext, onToken) {
  const messages = [{ role: 'user', content: userMessage }];
  return chatStream(messages, extraContext, onToken);
}

export { isMockMode };
