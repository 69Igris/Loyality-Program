import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { signAuthToken } from '../lib/jwt.js';

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  name: true,
  homeCity: true,
  createdAt: true,
};

export const signupSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(200, 'Password is too long.'),
  name: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

function hashRounds() {
  const parsed = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '11', 10);
  return Number.isFinite(parsed) && parsed >= 8 && parsed <= 14 ? parsed : 11;
}

export async function signup(req, res) {
  const { email, password, name } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, hashRounds());

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
      },
      select: PUBLIC_USER_FIELDS,
    });

    const token = signAuthToken(user);
    return res.status(201).json({ user, token });
  } catch (error) {
    req.log.error({ err: error }, '[auth] signup error');
    return res.status(500).json({ error: 'Could not create account.' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      homeCity: user.homeCity,
      createdAt: user.createdAt,
    };
    const token = signAuthToken(publicUser);
    return res.status(200).json({ user: publicUser, token });
  } catch (error) {
    req.log.error({ err: error }, '[auth] login error');
    return res.status(500).json({ error: 'Could not sign in.' });
  }
}

export async function me(req, res) {
  // requireAuth middleware has already attached req.user
  return res.status(200).json({ user: req.user });
}
