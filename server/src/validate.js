import { AppError } from './errors.js';

export const MIN_INPUT_CHARS = 20;
const LEVELS = ['beginner', 'intermediate', 'advanced', 'unclear'];
const CONFIDENCES = ['low', 'medium', 'high'];

/** Authoritative input check. Returns the trimmed text. */
export function validateInput(body, maxChars = 8000) {
  const text = body && typeof body === 'object' ? body.issueText : undefined;
  if (typeof text !== 'string') throw new AppError('INVALID_INPUT');
  const trimmed = text.trim();
  if (trimmed.length < MIN_INPUT_CHARS) throw new AppError('INVALID_INPUT');
  if (trimmed.length > maxChars) throw new AppError('INPUT_TOO_LONG');
  return trimmed;
}

/** Pull the first balanced JSON object out of model text (tolerates code fences / prose). */
export function extractJson(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const bad = () => new AppError('BAD_MODEL_OUTPUT');

/** Validate + normalise model output into the API contract's `data` object. */
export function parseModelOutput(raw) {
  const obj = extractJson(raw);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw bad();

  const summary = str(obj.summary);
  if (!summary) throw bad();

  const skills = (Array.isArray(obj.skills) ? obj.skills : [])
    .map((s) => (typeof s === 'string' ? { name: s.trim(), why: '' } : { name: str(s?.name), why: str(s?.why) }))
    .filter((s) => s.name)
    .slice(0, 6);
  if (skills.length < 2) throw bad();

  const d = obj.difficulty;
  const level = str(d?.level).toLowerCase();
  const confidence = str(d?.confidence).toLowerCase();
  const reasoning = str(d?.reasoning);
  if (!LEVELS.includes(level) || !CONFIDENCES.includes(confidence) || !reasoning) throw bad();

  const steps = (Array.isArray(obj.steps) ? obj.steps : [])
    .map((s) => ({ title: str(s?.title), detail: str(s?.detail) }))
    .filter((s) => s.title && s.detail)
    .slice(0, 8);
  if (steps.length < 4) throw bad();

  const caveats = (Array.isArray(obj.caveats) ? obj.caveats : [])
    .map(str).filter(Boolean).slice(0, 4);

  return { summary, skills, difficulty: { level, confidence, reasoning }, steps, caveats };
}
