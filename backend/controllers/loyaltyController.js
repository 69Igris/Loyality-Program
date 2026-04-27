import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const PROGRAM_TYPES = ['flight', 'hotel', 'wallet'];

export const programCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  programType: z.enum(['flight', 'hotel', 'wallet']),
  points: z.number().nonnegative('Points cannot be negative.'),
  conversionRate: z.number().positive('Conversion rate must be > 0.'),
  notes: z.string().trim().max(280).optional().nullable(),
});

export const programUpdateSchema = programCreateSchema.partial();

export async function listPrograms(req, res) {
  try {
    const programs = await prisma.loyaltyProgram.findMany({
      where: { userId: req.user.id },
      orderBy: [{ programType: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ programs });
  } catch (error) {
    req.log.error({ err: error }, '[loyalty] list error');
    res.status(500).json({ error: 'Could not load loyalty programs.' });
  }
}

export async function createProgram(req, res) {
  try {
    const program = await prisma.loyaltyProgram.create({
      data: { ...req.body, userId: req.user.id },
    });
    res.status(201).json({ program });
  } catch (error) {
    req.log.error({ err: error }, '[loyalty] create error');
    res.status(500).json({ error: 'Could not create loyalty program.' });
  }
}

export async function updateProgram(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.loyaltyProgram.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Program not found.' });
    }
    const program = await prisma.loyaltyProgram.update({ where: { id }, data: req.body });
    res.json({ program });
  } catch (error) {
    req.log.error({ err: error }, '[loyalty] update error');
    res.status(500).json({ error: 'Could not update loyalty program.' });
  }
}

export async function deleteProgram(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.loyaltyProgram.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Program not found.' });
    }
    await prisma.loyaltyProgram.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, '[loyalty] delete error');
    res.status(500).json({ error: 'Could not delete loyalty program.' });
  }
}
