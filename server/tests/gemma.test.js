import test from 'node:test';
import assert from 'node:assert/strict';
import { extractText, mapUpstreamError, callGemma, getConfig } from '../src/services/gemma.js';
import { AppError } from '../src/errors.js';

test('extractText skips thought parts and joins text', () => {
  const r = { candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: 'A' }, { text: 'B' }] } }] };
  assert.equal(extractText(r), 'AB');
  assert.equal(extractText({}), '');
});
test('mapUpstreamError maps statuses', () => {
  assert.equal(mapUpstreamError({ status: 429 }).code, 'RATE_LIMITED');
  assert.equal(mapUpstreamError({ status: 403 }).code, 'SERVER_MISCONFIGURED');
  assert.equal(mapUpstreamError({ status: 404 }).code, 'SERVER_MISCONFIGURED');
  assert.equal(mapUpstreamError({ status: 500 }).code, 'UPSTREAM_ERROR');
  assert.equal(mapUpstreamError(new Error('socket hang up')).code, 'UPSTREAM_ERROR');
  assert.equal(mapUpstreamError({ name: 'AbortError' }).code, 'UPSTREAM_TIMEOUT');
  assert.equal(mapUpstreamError({ name: 'TimeoutError' }).code, 'UPSTREAM_TIMEOUT');
  const e = new AppError('BAD_MODEL_OUTPUT');
  assert.equal(mapUpstreamError(e), e);
});
test('callGemma without key -> SERVER_MISCONFIGURED, no network', async () => {
  await assert.rejects(() => callGemma('x', { ...getConfig({}), apiKey: '' }), (e) => e.code === 'SERVER_MISCONFIGURED');
});
test('getConfig defaults', () => {
  const c = getConfig({});
  assert.equal(c.model, 'gemma-4-26b-a4b-it');
  assert.equal(c.timeoutMs, 30000);
  assert.equal(c.thinkingLevel, '');
});
