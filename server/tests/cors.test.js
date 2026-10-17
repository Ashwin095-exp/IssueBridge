import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resolveCorsOrigins } from '../src/cors.js';

const baseConfig = {
  apiKey: 'test-key',
  model: 'gemma-test',
  maxInputChars: 8000,
  corsOrigin: '',
};

const goodJson = JSON.stringify({
  summary: 'Fix a typo.',
  skills: [{ name: 'Markdown', why: 'x' }, { name: 'Git', why: 'y' }],
  difficulty: { level: 'beginner', confidence: 'high', reasoning: 'Small.' },
  steps: [1, 2, 3, 4].map((n) => ({ title: `S${n}`, detail: `D${n}` })),
  caveats: [],
});

const ISSUE = 'Title: crash\nThe CLI crashes when the output folder is missing.';

async function withServer(config = {}, fn) {
  const server = createApp({
    callModel: async () => ({ text: goodJson, model: 'gemma-test' }),
    config: { ...baseConfig, ...config },
  }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

test('resolveCorsOrigins: includes defaults, vercel production, deployed origin, and preview regex', () => {
  const origins = resolveCorsOrigins();
  assert.ok(origins.includes('http://localhost:5173'));
  assert.ok(origins.includes('http://127.0.0.1:5173'));
  assert.ok(origins.includes('https://issue-bridge-flfw.vercel.app'));
  assert.ok(origins.includes('https://issue-bridge-flfw-g0ukm1dzv-ashwintech2024-6188s-projects.vercel.app'));
  
  const regex = origins.find((o) => o instanceof RegExp);
  assert.ok(regex instanceof RegExp);
  assert.ok(regex.test('https://issue-bridge-flfw.vercel.app'));
  assert.ok(regex.test('https://issue-bridge-flfw-g0ukm1dzv-ashwintech2024-6188s-projects.vercel.app'));
  assert.ok(regex.test('https://issue-bridge-flfw-git-feat-test.vercel.app'));
  assert.ok(regex.test('https://issue-bridge-flfw-ashwin095-exp.vercel.app'));
  assert.equal(regex.test('https://evil-issue-bridge-flfw.vercel.app'), false);
  assert.equal(regex.test('https://issue-bridge-flfw.evil.com'), false);
});

test('resolveCorsOrigins: parses comma-separated custom origins', () => {
  const origins = resolveCorsOrigins('https://custom1.com, https://custom2.org/');
  assert.ok(origins.includes('https://custom1.com'));
  assert.ok(origins.includes('https://custom2.org'));
});

test('CORS: preflight OPTIONS for production Vercel domain succeeds with 204 and correct headers', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://issue-bridge-flfw.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://issue-bridge-flfw.vercel.app');
    assert.ok(res.headers.get('access-control-allow-methods')?.includes('POST'));
    assert.ok(res.headers.get('access-control-allow-headers')?.toLowerCase().includes('content-type'));
    assert.equal(res.headers.get('access-control-max-age'), '86400');
  });
});

test('CORS: POST /api/analyze from production Vercel domain returns 200 with allow-origin', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: {
        Origin: 'https://issue-bridge-flfw.vercel.app',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issueText: ISSUE }),
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://issue-bridge-flfw.vercel.app');
    const json = await res.json();
    assert.equal(json.ok, true);
  });
});

test('CORS: preflight OPTIONS and POST for exact deployed Vercel origin succeed', async () => {
  const deployedOrigin = 'https://issue-bridge-flfw-g0ukm1dzv-ashwintech2024-6188s-projects.vercel.app';
  await withServer({}, async (base) => {
    // Preflight
    const preflight = await fetch(`${base}/api/analyze`, {
      method: 'OPTIONS',
      headers: {
        Origin: deployedOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), deployedOrigin);
    assert.ok(preflight.headers.get('access-control-allow-methods')?.includes('POST'));
    assert.ok(preflight.headers.get('access-control-allow-headers')?.toLowerCase().includes('content-type'));

    // Actual POST
    const res = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: {
        Origin: deployedOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issueText: ISSUE }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), deployedOrigin);
    const json = await res.json();
    assert.equal(json.ok, true);
  });
});

test('CORS: preflight OPTIONS and POST for Vercel preview deployments succeed', async () => {
  const previewOrigin = 'https://issue-bridge-flfw-git-main-ashwin095-exp.vercel.app';
  await withServer({}, async (base) => {
    // Preflight
    const preflight = await fetch(`${base}/api/analyze`, {
      method: 'OPTIONS',
      headers: {
        Origin: previewOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), previewOrigin);

    // Actual POST
    const res = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: {
        Origin: previewOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issueText: ISSUE }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), previewOrigin);
  });
});

test('CORS: disallowed origin receives no access-control-allow-origin header', async () => {
  const attacker = 'https://malicious-site.example.com';
  await withServer({}, async (base) => {
    // Preflight
    const preflight = await fetch(`${base}/api/analyze`, {
      method: 'OPTIONS',
      headers: {
        Origin: attacker,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert.equal(preflight.headers.get('access-control-allow-origin'), null);

    // Actual POST
    const res = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: {
        Origin: attacker,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issueText: ISSUE }),
    });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});

test('CORS: error response from allowed origin retains access-control-allow-origin header', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: {
        Origin: 'https://issue-bridge-flfw.vercel.app',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issueText: 'too short' }), // triggers 400 INVALID_INPUT
    });

    assert.equal(res.status, 400);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://issue-bridge-flfw.vercel.app');
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.code, 'INVALID_INPUT');
  });
});

test('CORS: request without Origin header (curl / server-to-server) succeeds normally', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });
});
