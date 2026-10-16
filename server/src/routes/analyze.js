import { Router } from 'express';
import { AppError } from '../errors.js';
import { validateInput, parseModelOutput } from '../validate.js';
import { buildUserContent, RETRY_NUDGE } from '../prompt.js';

/** @param {{callModel:(userContent:string)=>Promise<{text:string,model:string}>, config:object}} deps */
export function analyzeRouter({ callModel, config }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, model: config.model, keyConfigured: Boolean(config.apiKey) });
  });

  router.post('/analyze', async (req, res, next) => {
    try {
      const issueText = validateInput(req.body, config.maxInputChars);
      if (!config.apiKey) throw new AppError('SERVER_MISCONFIGURED', 'GEMINI_API_KEY is not set.');
      const started = Date.now();
      const user = buildUserContent(issueText);

      let data, model;
      for (let attempt = 0; attempt < 2; attempt++) {
        const out = await callModel(attempt === 0 ? user : user + RETRY_NUDGE);
        model = out.model;
        try {
          data = parseModelOutput(out.text);
          break;
        } catch (e) {
          if (e instanceof AppError && e.code === 'BAD_MODEL_OUTPUT' && attempt === 0) {
            console.warn(`[analyze] model output failed schema validation on attempt 1; retrying with format nudge...`);
            continue;
          }
          console.error(`[analyze] schema validation failure: stage=parseModelOutput code=${e?.code || 'UNKNOWN'}`);
          throw e;
        }
      }
      res.json({ ok: true, data, meta: { model, latencyMs: Date.now() - started } });
    } catch (err) {
      if (err instanceof AppError) {
        console.error(`[analyze] request failed: stage=analyze_route code=${err.code} status=${err.status}`);
      } else {
        console.error(`[analyze] unexpected failure: stage=analyze_route error=${err?.name || 'Error'}`);
      }
      next(err);
    }
  });

  return router;
}
