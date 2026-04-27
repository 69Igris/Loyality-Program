import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const cardCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  earnRateSpend: z.number().positive('Spend per unit must be > 0.'),
  earnRatePoints: z.number().positive('Points per unit must be > 0.'),
  pointValue: z.number().positive('Point value must be > 0.'),
  currentPoints: z.number().nonnegative('Balance cannot be negative.').optional().default(0),
  notes: z.string().trim().max(280).optional().nullable(),
});

export const cardUpdateSchema = cardCreateSchema.partial();

export async function listCards(req, res) {
  try {
    const cards = await prisma.card.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ cards });
  } catch (error) {
    req.log.error({ err: error }, '[cards] list error');
    res.status(500).json({ error: 'Could not load cards.' });
  }
}

export async function createCard(req, res) {
  try {
    const card = await prisma.card.create({
      data: { ...req.body, userId: req.user.id },
    });
    res.status(201).json({ card });
  } catch (error) {
    req.log.error({ err: error }, '[cards] create error');
    res.status(500).json({ error: 'Could not create card.' });
  }
}

export async function updateCard(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Card not found.' });
    }
    const card = await prisma.card.update({ where: { id }, data: req.body });
    res.json({ card });
  } catch (error) {
    req.log.error({ err: error }, '[cards] update error');
    res.status(500).json({ error: 'Could not update card.' });
  }
}

export async function deleteCard(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Card not found.' });
    }
    await prisma.card.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, '[cards] delete error');
    res.status(500).json({ error: 'Could not delete card.' });
  }
}
