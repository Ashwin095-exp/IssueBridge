// The ONLY module that talks to Gemma 4 through the Gemini API.
import { GoogleGenAI } from '@google/genai';
import { AppError } from '../errors.js';
import { SYSTEM_INSTRUCTION } from '../prompt.js';

let client = null;
function getClient(apiKey) {
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export function getConfig(env = process.env) {
  return {
    apiKey: env.GEMINI_API_KEY || '',
    model: env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',
    timeoutMs: Number(env.MODEL_TIMEOUT_MS) || 30000,
    // Unset by default: thinkingConfig is only sent when explicitly chosen (see docs/planning/TASKS.md T04).
    thinkingLevel: env.THINKING_LEVEL || '',
    jsonMode: env.JSON_MODE === 'true',
  };
}

/** Concatenate the answer text, skipping any "thought" parts. */
export function extractText(response) {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('');
}

/** Map any SDK/network failure to an AppError without leaking upstream text. */
export function mapUpstreamError(err) {
  if (err instanceof AppError) return err;
  const status = Number(err?.status ?? err?.code);
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || err?.message === 'TIMEOUT') return new AppError('UPSTREAM_TIMEOUT');
  if (status === 429) return new AppError('RATE_LIMITED');
  if ([400, 401, 403, 404].includes(status)) return new AppError('SERVER_MISCONFIGURED'); // bad key / model id / permission
  return new AppError('UPSTREAM_ERROR');
}

/**
 * Call Gemma 4. Returns { text, model }. Never logs request bodies or the key.
 * @param {string} userContent
 * @param {object} [cfg] override config (tests)
 */
export async function callGemma(userContent, cfg = getConfig()) {
  if (!cfg.apiKey) throw new AppError('SERVER_MISCONFIGURED', 'GEMINI_API_KEY is not set.');
  const ai = getClient(cfg.apiKey);
  const config = { systemInstruction: SYSTEM_INSTRUCTION, abortSignal: AbortSignal.timeout(cfg.timeoutMs) };
  if (cfg.thinkingLevel) config.thinkingConfig = { thinkingLevel: cfg.thinkingLevel };
  if (cfg.jsonMode) config.responseMimeType = 'application/json';

  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(Object.assign(new Error('TIMEOUT'), { name: 'TimeoutError' })), cfg.timeoutMs + 1000); });
  try {
    const response = await Promise.race([
      ai.models.generateContent({ model: cfg.model, contents: userContent, config }),
      timeout,
    ]);
    return { text: extractText(response), model: cfg.model };
  } catch (err) {
    const mapped = mapUpstreamError(err);
    console.error(`[gemma] upstream failure: code=${mapped.code} status=${err?.status ?? 'n/a'}`);
    throw mapped;
  } finally {
    clearTimeout(timer);
  }
}
