import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { AppError } from '../src/errors.js';

const goodJson = JSON.stringify({
  summary: 'Fix a typo.',
  skills: [{ name: 'Markdown', why: 'x' }],
  difficulty: { level: 'beginner', confidence: 'high', reasoning: 'Small.' },
  steps: [1, 2, 3, 4].map((n) => ({ title: `S${n}`, detail: `D${n}` })),
  caveats: [],
});
const baseConfig = { apiKey: 'test-key-not-real', model: 'gemma-test', maxInputChars: 8000, corsOrigin: 'http://localhost:5173' };
const ISSUE = 'Title: crash\nThe CLI crashes when the output folder is missing.';

async function withServer(callModel, config, fn) {
  const server = createApp({ callModel, config: { ...baseConfig, ...config } }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}
const post = (base, body, raw) => fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) });

test('health never leaks the key', async () => {
  await withServer(async () => ({}), {}, async (base) => {
    const t = await (await fetch(`${base}/api/health`)).text();
    assert.deepEqual(JSON.parse(t), { ok: true, model: 'gemma-test', keyConfigured: true });
    assert.ok(!t.includes('test-key'));
  });
});
test('success returns data + meta with model from server', async () => {
  await withServer(async () => ({ text: goodJson, model: 'gemma-test' }), {}, async (base) => {
    const r = await post(base, { issueText: ISSUE });
    const j = await r.json();
    assert.equal(r.status, 200);
    assert.equal(j.ok, true);
    assert.equal(j.meta.model, 'gemma-test');
    assert.equal(typeof j.meta.latencyMs, 'number');
    assert.equal(j.data.steps.length, 4);
  });
});
test('invalid / too long / malformed body', async () => {
  await withServer(async () => ({ text: goodJson, model: 'm' }), {}, async (base) => {
    let r = await post(base, { issueText: 'short' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_INPUT');
    r = await post(base, { issueText: 'a'.repeat(8001) }); assert.equal(r.status, 413); assert.equal((await r.json()).error.code, 'INPUT_TOO_LONG');
    r = await post(base, null, '{bad json'); assert.equal(r.status, 400); assert.equal((await r.json()).ok, false);
    r = await post(base, { issueText: 'a'.repeat(200000) }); assert.equal(r.status, 413);
  });
});
test('missing key -> SERVER_MISCONFIGURED', async () => {
  let called = false;
  await withServer(async () => { called = true; return { text: goodJson, model: 'm' }; }, { apiKey: '' }, async (base) => {
    const r = await post(base, { issueText: ISSUE });
    assert.equal(r.status, 500); assert.equal((await r.json()).error.code, 'SERVER_MISCONFIGURED'); assert.equal(called, false);
  });
});
test('bad output once -> retry succeeds', async () => {
  let n = 0;
  await withServer(async () => ({ text: ++n === 1 ? 'sorry, no json' : goodJson, model: 'm' }), {}, async (base) => {
    const r = await post(base, { issueText: ISSUE });
    assert.equal(r.status, 200); assert.equal(n, 2);
  });
});
test('bad output twice -> BAD_MODEL_OUTPUT (2 calls max)', async () => {
  let n = 0;
  await withServer(async () => { n++; return { text: 'nope', model: 'm' }; }, {}, async (base) => {
    const r = await post(base, { issueText: ISSUE });
    assert.equal(r.status, 502); assert.equal((await r.json()).error.code, 'BAD_MODEL_OUTPUT'); assert.equal(n, 2);
  });
});
test('upstream errors map to envelope, no raw text leaked', async () => {
  for (const [code, status] of [['RATE_LIMITED', 429], ['UPSTREAM_TIMEOUT', 504], ['UPSTREAM_ERROR', 502]]) {
    await withServer(async () => { throw new AppError(code); }, {}, async (base) => {
      const r = await post(base, { issueText: ISSUE }); const j = await r.json();
      assert.equal(r.status, status); assert.equal(j.error.code, code);
    });
  }
  await withServer(async () => { throw new Error('secret upstream detail'); }, {}, async (base) => {
    const j = await (await post(base, { issueText: ISSUE })).json();
    assert.equal(j.error.code, 'UPSTREAM_ERROR'); assert.ok(!JSON.stringify(j).includes('secret upstream'));
  });
});
