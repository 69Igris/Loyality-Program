import { verifyAuthToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

function extractBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

async function loadUserFromToken(token) {
  const decoded = verifyAuthToken(token);
  if (!decoded) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, name: true, homeCity: true, createdAt: true },
  });
  return user || null;
}

// Hard requirement — fails 401 if no valid user.
export async function requireAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const user = await loadUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  } catch (error) {
    req.log?.error?.({ err: error }, '[auth] requireAuth error');
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

// Soft auth — attaches req.user if a valid token is present, but does not block.
export async function optionalAuth(req, _res, next) {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const user = await loadUserFromToken(token);
    if (user) req.user = user;
  } catch (error) {
    req.log?.warn?.({ msg: error.message }, '[auth] optionalAuth could not resolve user');
  }
  next();
}
