import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, parseModelOutput, extractJson } from '../src/validate.js';

const good = {
  summary: 'Fix a typo.',
  skills: [{ name: 'Markdown', why: 'README is Markdown' }, { name: 'Git', why: 'to open a PR' }],
  difficulty: { level: 'beginner', confidence: 'high', reasoning: 'Tiny change.' },
  steps: [1, 2, 3, 4].map((n) => ({ title: `Step ${n}`, detail: `Do thing ${n}` })),
  caveats: ['No repo access'],
};
const code = (fn) => { try { fn(); } catch (e) { return e.code; } return null; };

test('validateInput: accepts and trims', () => {
  assert.equal(validateInput({ issueText: '  ' + 'a'.repeat(25) + '  ' }), 'a'.repeat(25));
});
test('validateInput: rejects missing / non-string / short', () => {
  assert.equal(code(() => validateInput(undefined)), 'INVALID_INPUT');
  assert.equal(code(() => validateInput({ issueText: 42 })), 'INVALID_INPUT');
  assert.equal(code(() => validateInput({ issueText: 'too short' })), 'INVALID_INPUT');
  assert.equal(code(() => validateInput({ issueText: ' '.repeat(50) })), 'INVALID_INPUT');
});
test('validateInput: rejects too long', () => {
  assert.equal(code(() => validateInput({ issueText: 'a'.repeat(8001) })), 'INPUT_TOO_LONG');
  assert.equal(validateInput({ issueText: 'a'.repeat(8000) }).length, 8000);
});
test('parseModelOutput: plain JSON', () => {
  assert.deepEqual(parseModelOutput(JSON.stringify(good)), good);
});
test('parseModelOutput: fenced JSON with prose', () => {
  const d = parseModelOutput('Here you go:\n```json\n' + JSON.stringify(good) + '\n```\nHope it helps');
  assert.equal(d.difficulty.level, 'beginner');
});
test('parseModelOutput: JSON with braces inside strings', () => {
  const g = { ...good, summary: 'Use {braces} and "quotes" } carefully' };
  assert.equal(parseModelOutput('x ' + JSON.stringify(g)).summary, g.summary);
});
test('parseModelOutput: normalises case, clamps, drops empties, defaults caveats', () => {
  const d = parseModelOutput(JSON.stringify({
    ...good,
    difficulty: { level: 'Beginner', confidence: 'HIGH', reasoning: 'ok' },
    skills: [...Array(9)].map((_, i) => ({ name: `s${i}`, why: '' })).concat([{ name: '' }]),
    steps: [...Array(12)].map((_, i) => ({ title: `t${i}`, detail: `d${i}` })).concat([{ title: '', detail: 'x' }]),
    caveats: undefined,
  }));
  assert.equal(d.difficulty.level, 'beginner');
  assert.equal(d.skills.length, 6);
  assert.equal(d.steps.length, 8);
  assert.deepEqual(d.caveats, []);
});
test('parseModelOutput: bad outputs -> BAD_MODEL_OUTPUT', () => {
  const cases = [
    '', 'not json at all', '[1,2,3]', '{"summary":',
    JSON.stringify({ ...good, summary: '' }),
    JSON.stringify({ ...good, skills: [] }),
    JSON.stringify({ ...good, difficulty: { level: 'impossible', confidence: 'high', reasoning: 'x' } }),
    JSON.stringify({ ...good, difficulty: { level: 'beginner', confidence: 'certain', reasoning: 'x' } }),
    JSON.stringify({ ...good, steps: good.steps.slice(0, 3) }),
  ];
  for (const c of cases) assert.equal(code(() => parseModelOutput(c)), 'BAD_MODEL_OUTPUT', c.slice(0, 40));
});
test('extractJson: non-string -> null', () => assert.equal(extractJson(null), null));
