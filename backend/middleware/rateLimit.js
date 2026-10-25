// Per-route rate limiters. Keys default to req.ip; we use a small custom key
// for /me which we want to throttle per-user once authenticated.
import rateLimit from 'express-rate-limit';

const standardHeaders = true;
const legacyHeaders = false;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: { error: 'Too many auth attempts. Please wait a few minutes and try again.' },
  standardHeaders,
  legacyHeaders,
});

export const optimizeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many optimization requests. Please slow down.' },
  standardHeaders,
  legacyHeaders,
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many write requests. Please slow down.' },
  standardHeaders,
  legacyHeaders,
});

// Agent queries call an LLM several times, so they get a tighter, per-user budget.
export const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AGENT_RATE_LIMIT_PER_MIN) || 12,
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip),
  message: { error: 'Too many assistant requests. Please wait a minute and try again.' },
  standardHeaders,
  legacyHeaders,
});
