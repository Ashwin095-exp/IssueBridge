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
    timeoutMs: Number(env.MODEL_TIMEOUT_MS) || 90000,
    thinkingLevel: env.THINKING_LEVEL || 'minimal',
    jsonMode: env.JSON_MODE !== 'false',
  };
}

/** Concatenate the answer text, skipping any "thought" parts. */
export function extractText(response) {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('');
}

export function isConnectionFailure(err) {
  const code = err?.code || err?.cause?.code;
  const msg = typeof err?.message === 'string' ? err.message : '';
  return !err?.status && (
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    (err?.name === 'TypeError' && msg.includes('fetch failed')) ||
    msg.includes('socket hang up') ||
    msg.includes('network')
  );
}

/** Map any SDK/network failure to an AppError without leaking upstream text. */
export function mapUpstreamError(err) {
  if (err instanceof AppError) return err;
  const status = Number(err?.status ?? err?.code);
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || err?.message === 'TIMEOUT') {
    return new AppError('UPSTREAM_TIMEOUT', 'The model took too long to respond. Please retry.');
  }
  if (status === 429) {
    return new AppError('RATE_LIMITED', 'The model is busy or quota is exhausted. Please try again in a minute.');
  }
  if ([400, 401, 403, 404].includes(status)) {
    return new AppError('SERVER_MISCONFIGURED', 'Server configuration issue with the AI provider. Check the server log.');
  }
  if (isConnectionFailure(err)) {
    return new AppError('UPSTREAM_ERROR', 'Could not connect to the AI model provider. Check network connection and retry.');
  }
  const statusNote = Number.isFinite(status) && status > 0 ? ` (HTTP ${status})` : '';
  return new AppError('UPSTREAM_ERROR', `The AI model provider reported a temporary server error${statusNote}. Please retry.`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call Gemma 4. Returns { text, model }. Never logs request bodies or the key.
 * @param {string} userContent
 * @param {object} [cfg] override config (tests)
 */
export async function callGemma(userContent, cfg = getConfig()) {
  if (!cfg.apiKey) throw new AppError('SERVER_MISCONFIGURED', 'GEMINI_API_KEY is not set.');
  const ai = getClient(cfg.apiKey);
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const config = { systemInstruction: SYSTEM_INSTRUCTION, abortSignal: AbortSignal.timeout(cfg.timeoutMs) };
    if (cfg.thinkingLevel) config.thinkingConfig = { thinkingLevel: cfg.thinkingLevel };
    if (cfg.jsonMode) config.responseMimeType = 'application/json';

    let timer;
    const timeout = new Promise((_, rej) => {
      timer = setTimeout(() => rej(Object.assign(new Error('TIMEOUT'), { name: 'TimeoutError' })), cfg.timeoutMs + 1000);
    });

    try {
      const response = await Promise.race([
        ai.models.generateContent({ model: cfg.model, contents: userContent, config }),
        timeout,
      ]);
      return { text: extractText(response), model: cfg.model };
    } catch (err) {
      const status = Number(err?.status ?? err?.code);
      const isTransient5xx = status >= 500 && status < 600;

      if (isTransient5xx && attempt < maxAttempts - 1) {
        console.warn(`[gemma] transient upstream error: stage=generateContent status=${status} attempt=${attempt + 1}/${maxAttempts}; retrying in 1000ms...`);
        await sleep(1000);
        continue;
      }

      const mapped = mapUpstreamError(err);
      console.error(`[gemma] upstream failure: stage=generateContent code=${mapped.code} status=${err?.status ?? 'n/a'} isNetwork=${isConnectionFailure(err)}`);
      throw mapped;
    } finally {
      clearTimeout(timer);
    }
  }
}
