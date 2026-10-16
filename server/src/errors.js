// Error codes -> HTTP status + user-facing message (see docs/planning/ARCHITECTURE.md section 4).
export const ERROR_TABLE = {
  INVALID_INPUT: { status: 400, message: 'Paste at least 20 characters of an issue.' },
  INPUT_TOO_LONG: { status: 413, message: "That's too long; trim it to the main description." },
  RATE_LIMITED: { status: 429, message: 'The model is busy or the quota is used up. Try again in a minute.' },
  UPSTREAM_TIMEOUT: { status: 504, message: 'The model took too long. Please retry.' },
  UPSTREAM_ERROR: { status: 502, message: 'The model provider encountered an error. Please retry.' },
  BAD_MODEL_OUTPUT: { status: 502, message: "The model's answer was malformed. Please retry." },
  SERVER_MISCONFIGURED: { status: 500, message: 'Server setup problem. Check the server log.' },
};

export class AppError extends Error {
  constructor(code, message) {
    super(message || ERROR_TABLE[code]?.message || code);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_TABLE[code]?.status ?? 500;
  }
}

export function toEnvelope(err) {
  const known = err instanceof AppError ? err : new AppError('UPSTREAM_ERROR');
  return { status: known.status, body: { ok: false, error: { code: known.code, message: known.message } } };
}
