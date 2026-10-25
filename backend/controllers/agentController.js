import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const agentChatSchema = z
  .object({
    message: z.string().trim().min(1, 'Message is required.').max(1000, 'Message is too long (max 1000 characters).'),
    conversationId: z
      .string()
      .regex(/^[0-9a-f-]{36}$/i, 'Invalid conversation id.')
      .optional()
      .nullable(),
  })
  .strict();

// Account data for the agent's get_loyalty_balance tool. Always scoped to the
// authenticated user; card reward balances count as wallet-flexible points,
// matching the optimizer's treatment.
export async function loadBalancesForUser(userId) {
  const [programs, cards] = await Promise.all([
    prisma.loyaltyProgram.findMany({
      where: { userId },
      select: { name: true, programType: true, points: true, conversionRate: true },
    }),
    prisma.card.findMany({
      where: { userId },
      select: { name: true, currentPoints: true, pointValue: true },
    }),
  ]);

  return [
    ...programs
      .filter((p) => p.points > 0)
      .map((p) => ({
        name: p.name,
        programType: p.programType,
        points: p.points,
        valuePerPoint: p.conversionRate,
        kind: 'program',
      })),
    ...cards
      .filter((c) => (c.currentPoints ?? 0) > 0 && c.pointValue > 0)
      .map((c) => ({
        name: `${c.name} balance`,
        programType: 'wallet',
        points: c.currentPoints,
        valuePerPoint: c.pointValue,
        kind: 'card',
      })),
  ];
}

function wantsStream(req) {
  return `${req.headers.accept || ''}`.includes('application/x-ndjson');
}

export function createAgentController({ agent }) {
  async function chat(req, res) {
    const { message, conversationId } = req.body;
    const user = { id: req.user.id, homeCity: req.user.homeCity };

    // Abort the agent if the client goes away mid-request.
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) controller.abort();
    });

    if (!wantsStream(req)) {
      try {
        const result = await agent.run({ user, message, conversationId, signal: controller.signal });
        return res.status(result.status === 'error' ? 502 : 200).json(result);
      } catch (error) {
        req.log?.error?.({ err: error }, '[agent] chat failed');
        return res.status(500).json({ error: 'The assistant failed to respond. Please try again.' });
      }
    }

    // NDJSON stream: one JSON object per line — workflow events, then the result.
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const write = (event) => {
      if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
    };

    try {
      const result = await agent.run({
        user,
        message,
        conversationId,
        signal: controller.signal,
        onEvent: write,
      });
      write({ type: 'result', result });
    } catch (error) {
      req.log?.error?.({ err: error }, '[agent] stream failed');
      write({ type: 'error', error: 'The assistant failed to respond. Please try again.' });
    } finally {
      res.end();
    }
  }

  return { chat };
}
