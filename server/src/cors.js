import cors from 'cors';

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://issue-bridge-flfw.vercel.app',
  'https://issue-bridge-flfw-g0ukm1dzv-ashwintech2024-6188s-projects.vercel.app',
];

export const VERCEL_PREVIEW_REGEX = /^https:\/\/issue-bridge-flfw(-[a-z0-9-]+)?\.vercel\.app$/i;

/**
 * Normalizes an origin string by trimming whitespace and trailing slashes.
 * @param {string} origin
 * @returns {string}
 */
export function normalizeOrigin(origin) {
  if (typeof origin !== 'string') return '';
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Resolves allowed CORS origins from default and optional environment settings.
 * Supports comma-separated strings, single origin strings, or arrays.
 * Automatically derives preview deployment regex if a *.vercel.app domain is provided.
 *
 * @param {string|string[]|RegExp[]} [configured]
 * @param {{ includeDefaults?: boolean }} [options]
 * @returns {(string|RegExp)[]}
 */
export function resolveCorsOrigins(configured = process.env.CORS_ORIGIN, { includeDefaults = true } = {}) {
  const allowed = includeDefaults ? [...DEFAULT_ALLOWED_ORIGINS, VERCEL_PREVIEW_REGEX] : [];

  if (typeof configured === 'string' && configured.trim()) {
    const parts = configured.split(',').map((p) => normalizeOrigin(p)).filter(Boolean);
    for (const part of parts) {
      if (!allowed.includes(part)) {
        allowed.push(part);
      }
      // If a custom Vercel domain was configured, also allow its preview deployments
      const vercelMatch = part.match(/^https:\/\/([a-z0-9-]+)\.vercel\.app$/i);
      if (vercelMatch && vercelMatch[1]) {
        const slug = vercelMatch[1];
        if (slug !== 'issue-bridge-flfw') {
          allowed.push(new RegExp(`^https:\/\/${slug}(-[a-z0-9-]+)?\\.vercel\\.app$`, 'i'));
        }
      }
    }
  } else if (Array.isArray(configured)) {
    for (const item of configured) {
      if (typeof item === 'string') {
        const norm = normalizeOrigin(item);
        if (norm && !allowed.includes(norm)) allowed.push(norm);
      } else if (item instanceof RegExp) {
        allowed.push(item);
      }
    }
  }

  return allowed;
}

/**
 * Creates configured CORS middleware.
 *
 * @param {string|string[]|RegExp[]} [configuredOrigin]
 * @param {{ includeDefaults?: boolean }} [options]
 */
export function createCorsMiddleware(configuredOrigin = process.env.CORS_ORIGIN, options = {}) {
  const allowed = resolveCorsOrigins(configuredOrigin, options);

  return cors({
    origin: allowed,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
}
