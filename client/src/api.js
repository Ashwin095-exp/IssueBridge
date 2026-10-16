const BASE = import.meta.env.VITE_API_BASE_URL || '';
const CLIENT_TIMEOUT_MS = 45000; // slightly above the server's default 30 s

export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export const ERROR_MESSAGES = {
  INVALID_INPUT: 'Paste at least 20 characters of an issue.',
  INPUT_TOO_LONG: "That's too long. Trim it to the main description.",
  RATE_LIMITED: 'The model is busy or the quota is used up. Try again in a minute.',
  UPSTREAM_TIMEOUT: 'The model took too long. Please retry.',
  UPSTREAM_ERROR: "Couldn't reach the model. Please retry.",
  BAD_MODEL_OUTPUT: "The model's answer was malformed. Please retry.",
  SERVER_MISCONFIGURED: 'Server setup problem (for example a missing or invalid API key). Check the server log.',
  NETWORK: 'Cannot reach the IssueBridge server. Is it running on port 3001?',
  CLIENT_TIMEOUT: 'This is taking too long. Please retry.',
  UNKNOWN: 'Something unexpected happened. Please retry.',
};

export async function analyze(issueText) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueText }),
      signal: ctrl.signal,
    });
  } catch (e) {
    const code = e?.name === 'AbortError' ? 'CLIENT_TIMEOUT' : 'NETWORK';
    throw new ApiError(code, ERROR_MESSAGES[code]);
  } finally {
    clearTimeout(timer);
  }
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON (e.g. proxy error page) */ }
  if (!body) {
    const code = res.status >= 500 ? 'NETWORK' : 'UNKNOWN';
    throw new ApiError(code, ERROR_MESSAGES[code]);
  }
  if (!res.ok || body.ok !== true) {
    const code = body?.error?.code && ERROR_MESSAGES[body.error.code] ? body.error.code : 'UNKNOWN';
    throw new ApiError(code, ERROR_MESSAGES[code]);
  }
  return { data: body.data, meta: body.meta };
}
