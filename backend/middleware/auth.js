import { verifyAuthToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

function extractBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

// Verify the JWT, then resolve the user it names via `findUserById`.
export function tokenResolver(findUserById) {
  return async (token) => {
    const decoded = verifyAuthToken(token);
    if (!decoded) return null;
    return (await findUserById(decoded.userId)) || null;
  };
}

const loadUserFromToken = tokenResolver((id) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, homeCity: true, createdAt: true },
  }),
);

// Factory so tests can swap the user lookup without touching the database.
export function createRequireAuth(resolveUser = loadUserFromToken) {
  return async function requireAuthMiddleware(req, res, next) {
    const token = extractBearer(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    try {
      const user = await resolveUser(token);
      if (!user) return res.status(401).json({ error: 'Invalid or expired token.' });
      req.user = user;
      next();
    } catch (error) {
      req.log?.error?.({ err: error }, '[auth] requireAuth error');
      res.status(500).json({ error: 'Authentication check failed.' });
    }
  };
}

// Hard requirement — fails 401 if no valid user.
export const requireAuth = createRequireAuth();

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
