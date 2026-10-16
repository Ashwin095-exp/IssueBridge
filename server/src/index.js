import 'dotenv/config';
import { createApp } from './app.js';
import { callGemma, getConfig } from './services/gemma.js';

const g = getConfig();
const config = {
  ...g,
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  maxInputChars: Number(process.env.MAX_INPUT_CHARS) || 8000,
};
if (!config.apiKey) console.warn('[server] WARNING: GEMINI_API_KEY is not set. /api/analyze will return SERVER_MISCONFIGURED.');

const app = createApp({ callModel: (u) => callGemma(u, config), config });
app.listen(config.port, () => console.log(`[server] IssueBridge API on http://localhost:${config.port} (model: ${config.model})`));
