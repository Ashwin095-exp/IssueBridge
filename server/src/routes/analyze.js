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
        try { data = parseModelOutput(out.text); break; }
        catch (e) { if (!(e instanceof AppError) || e.code !== 'BAD_MODEL_OUTPUT' || attempt === 1) throw e; }
      }
      res.json({ ok: true, data, meta: { model, latencyMs: Date.now() - started } });
    } catch (err) { next(err); }
  });

  return router;
}
