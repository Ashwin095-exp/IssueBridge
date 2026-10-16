// Run on YOUR machine (the build sandbox cannot reach the Gemini API):
//   cd server && cp .env.example .env   # put your key in .env
//   npm run verify
// Covers TASKS T01 (raw REST), T03 (SDK) and T04 (JSON reliability on samples). Never prints the key.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, buildUserContent } from '../src/prompt.js';
import { parseModelOutput, extractJson } from '../src/validate.js';
import { extractText } from '../src/services/gemma.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const key = process.env.GEMINI_API_KEY;
if (!key || key.startsWith('your_')) { console.error('GEMINI_API_KEY missing: copy server/.env.example to server/.env and set it.'); process.exit(1); }
const MODELS = ['gemma-4-26b-a4b-it', 'gemma-4-31b-it'];
const log = [];
const out = (s) => { console.log(s); log.push(s); };
const scrub = (s) => String(s).split(key).join('[REDACTED]');
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function rest(model) {
  const t = Date.now();
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello in one sentence.' }] }] }),
    });
    const j = await r.json().catch(() => ({}));
    const parts = j?.candidates?.[0]?.content?.parts ?? [];
    const kinds = parts.map((p) => (p.thought ? 'thought' : 'text')).join(',') || 'none';
    const note = r.ok ? `parts=[${kinds}] text="${scrub(extractText(j)).slice(0, 80)}"` : `error=${scrub(j?.error?.status || '')} ${scrub(j?.error?.message || '').slice(0, 160)}`;
    out(`T01 REST ${model}: HTTP ${r.status} ${Date.now() - t}ms ${note}`);
    return r.ok;
  } catch (e) { out(`T01 REST ${model}: NETWORK ERROR ${scrub(e.message)}`); return false; }
}

const ai = new GoogleGenAI({ apiKey: key });
async function sdk(model, extra = {}, user = 'Say hello in one sentence.', system) {
  const t = Date.now();
  try {
    const res = await ai.models.generateContent({ model, contents: user, config: { ...(system ? { systemInstruction: system } : {}), ...extra } });
    return { ok: true, ms: Date.now() - t, text: extractText(res) };
  } catch (e) { return { ok: false, ms: Date.now() - t, err: `status=${e?.status ?? 'n/a'} ${scrub(e?.message || '').slice(0, 160)}` }; }
}

const working = [];
for (const m of MODELS) if (await rest(m)) working.push(m);
if (!working.length) { out('RESULT: no Gemma 4 model ID worked over REST. Diagnose: 400=bad key, 403=permission/region, 404=model id, 429=quota. Try a hotspot / ask organisers.'); finish(1); }

const model = process.env.GEMMA_MODEL && working.includes(process.env.GEMMA_MODEL) ? process.env.GEMMA_MODEL : working[0];
out(`\nUsing model for SDK/JSON tests: ${model}`);
const r1 = await sdk(model);
out(`T03 SDK ${model}: ${r1.ok ? `OK ${r1.ms}ms text="${r1.text.slice(0, 80)}"` : `FAIL ${r1.err}`}`);

for (const level of ['minimal', 'high']) {
  const r = await sdk(model, { thinkingConfig: { thinkingLevel: level } });
  out(`T04 thinkingLevel=${level}: ${r.ok ? `OK ${r.ms}ms` : `FAIL ${r.err}`}`);
}
const rj = await sdk(model, { responseMimeType: 'application/json' }, 'Return {"ok":true} as JSON.');
out(`T04 JSON mode (responseMimeType): ${rj.ok ? `OK ${rj.ms}ms text="${rj.text.slice(0, 60)}"` : `FAIL ${rj.err}`}`);

const dir = path.join(here, '..', '..', 'samples');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
const lat = []; let good = 0, total = 0;
for (const f of files) for (let run = 1; run <= 2; run++) {
  total++;
  const r = await sdk(model, {}, buildUserContent(fs.readFileSync(path.join(dir, f), 'utf8')), SYSTEM_INSTRUCTION);
  let verdict;
  if (!r.ok) verdict = `CALL FAIL ${r.err}`;
  else { try { parseModelOutput(r.text); good++; lat.push(r.ms); verdict = 'valid'; } catch { verdict = extractJson(r.text) ? 'JSON but fails schema' : 'not JSON'; } }
  out(`T04 sample ${f} run ${run}: ${verdict} ${r.ms}ms`);
}
out(`T04 summary: ${good}/${total} valid; median latency ${lat.length ? median(lat) + 'ms' : 'n/a'}`);
out(`\nRESULT: working IDs=${working.join(', ')}. Set GEMMA_MODEL in server/.env accordingly.`);
finish(good === total ? 0 : 2);

function finish(code) {
  const p = path.join(here, '..', '..', 'docs', 'verification-log.md');
  fs.writeFileSync(p, `# Verification log\nGenerated ${new Date().toISOString()} by server/scripts/verify.js (key redacted)\n\n\`\`\`\n${log.join('\n')}\n\`\`\`\n`);
  console.log(`\nWrote ${p}`);
  process.exit(code);
}
