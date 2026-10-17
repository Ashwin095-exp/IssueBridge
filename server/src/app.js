import express from 'express';
import { createCorsMiddleware } from './cors.js';
import { analyzeRouter } from './routes/analyze.js';
import { AppError, toEnvelope } from './errors.js';

export function createApp({ callModel, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(createCorsMiddleware(config.corsOrigin));
  // Slightly above max input so validation (not the parser) reports "too long".
  app.use(express.json({ limit: `${Math.ceil((config.maxInputChars * 4 + 2048) / 1024)}kb` }));
  app.use('/api', analyzeRouter({ callModel, config }));
  app.use('/api', (_req, _res, next) => next(new AppError('INVALID_INPUT', 'Unknown API route.')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') err = new AppError('INVALID_INPUT', 'Request body must be valid JSON.');
    else if (err?.type === 'entity.too.large') err = new AppError('INPUT_TOO_LONG');
    const { status, body } = toEnvelope(err);
    if (status >= 500) console.error(`[server] ${body.error.code}`);
    res.status(status).json(body);
  });
  return app;
}
