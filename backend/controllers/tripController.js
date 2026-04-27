import { prisma } from '../lib/prisma.js';

const SUMMARY_FIELDS = {
  id: true,
  fromCity: true,
  toCity: true,
  effectiveCost: true,
  savings: true,
  pointsUsed: true,
  createdAt: true,
};

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function listTrips(req, res) {
  try {
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const cursor = req.query.cursor;

    const trips = await prisma.trip.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: SUMMARY_FIELDS,
    });

    const hasMore = trips.length > limit;
    const page = hasMore ? trips.slice(0, limit) : trips;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Aggregate quick stats so the dashboard doesn't need a second round trip.
    const stats = await prisma.trip.aggregate({
      where: { userId: req.user.id },
      _count: { _all: true },
      _sum: { savings: true, pointsUsed: true, effectiveCost: true },
    });

    res.json({
      trips: page,
      nextCursor,
      stats: {
        count: stats._count?._all ?? 0,
        totalSavings: stats._sum?.savings ?? 0,
        totalPointsUsed: stats._sum?.pointsUsed ?? 0,
        totalEffectiveCost: stats._sum?.effectiveCost ?? 0,
      },
    });
  } catch (error) {
    req.log.error({ err: error }, '[trips] list error');
    res.status(500).json({ error: 'Could not load trip history.' });
  }
}

export async function getTrip(req, res) {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.userId !== req.user.id) {
      return res.status(404).json({ error: 'Trip not found.' });
    }
    res.json({ trip });
  } catch (error) {
    req.log.error({ err: error }, '[trips] get error');
    res.status(500).json({ error: 'Could not load trip.' });
  }
}

export async function deleteTrip(req, res) {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.userId !== req.user.id) {
      return res.status(404).json({ error: 'Trip not found.' });
    }
    await prisma.trip.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, '[trips] delete error');
    res.status(500).json({ error: 'Could not delete trip.' });
  }
}
