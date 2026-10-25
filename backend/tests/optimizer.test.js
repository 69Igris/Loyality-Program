// Regression: the existing optimizer still works after pricing moved to lib/pricing.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';

process.env.RAG_SERVICE_URL = 'http://127.0.0.1:9'; // unreachable: explanation falls back
const { explainLoyalty } = await import('../controllers/explainController.js');

test('POST /api/optimize returns a deterministic plan', async () => {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger: pino({ level: 'silent' }) }));
  app.post('/api/optimize', explainLoyalty);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip: { from: 'Delhi', to: 'Mumbai' },
        userData: { cards: [], loyalty_programs: [{ name: 'MakeMyTrip Wallet', points: 3000, conversion_rate: 1, type: 'wallet' }] },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.pricing.routeKey, 'delhi-mumbai');
    assert.equal(body.pricing.flightPrice, 6131.78);
    assert.equal(body.pointsUsed, 3000);
  } finally {
    server.close();
  }
});
