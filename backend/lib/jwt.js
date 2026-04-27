import jwt from 'jsonwebtoken';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error(
      'JWT_SECRET is missing or too short. Set a strong value in backend/.env (>= 24 chars).',
    );
  }
  return secret;
}

export function signAuthToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    getSecret(),
    { expiresIn },
  );
}

export function verifyAuthToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    if (!payload || typeof payload !== 'object' || !payload.sub) return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
