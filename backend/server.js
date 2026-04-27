import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import authRoutes from './routes/auth.js';
import cardRoutes from './routes/cards.js';
import explainRoutes from './routes/explain.js';
import loyaltyRoutes from './routes/loyalty.js';
import tripRoutes from './routes/trips.js';
import { optionalAuth } from './middleware/auth.js';
import { authLimiter, optimizeLimiter, writeLimiter } from './middleware/rateLimit.js';
import { logger } from './lib/logger.js';

const app = express();
const PORT = process.env.PORT || 5000;

function normalizeOrigin(origin) {
  return `${origin}`.trim().replace(/\/+$/, '').toLowerCase();
}

const defaultOrigins = 'http://localhost:5173,http://127.0.0.1:5173';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || defaultOrigins)
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

// Trust the first proxy (Render, Vercel rewrites, etc.) so req.ip + rate limit
// based on X-Forwarded-For works correctly in production.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // Frontend served separately on Vercel
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: '1mb' }));

// Public health checks
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/health/live', (_req, res) => res.status(200).json({ status: 'live' }));

// Auth routes — limited
app.use('/api/auth', authLimiter, authRoutes);

// CRUD — write-limited
app.use('/api/cards', writeLimiter, cardRoutes);
app.use('/api/loyalty', writeLimiter, loyaltyRoutes);
app.use('/api/trips', tripRoutes);

// Optimizer — accepts both authed and anonymous; rate-limited and softly authed
app.use('/api', optimizeLimiter, optionalAuth, explainRoutes);

// 404 fallthrough
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use((err, req, res, _next) => {
  req.log?.error?.({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, '[server] Ledger API is up');
});
