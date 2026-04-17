import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import explainRoutes from './routes/explain.js';

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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  }),
);
app.use(express.json());

app.use('/api', explainRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Loyalty optimizer API running on http://localhost:${PORT}`);
});
