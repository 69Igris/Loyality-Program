import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingInformation, parseMessage, understand } from '../agent/intent.js';

test('extracts route, category, nights and stated points', () => {
  const { slots, intent } = parseMessage('I have 40k points, fly from Delhi to Goa and stay 3 nights');
  assert.equal(intent, 'recommend');
  assert.equal(slots.origin, 'delhi');
  assert.equal(slots.destination, 'goa');
  assert.equal(slots.category, 'both');
  assert.equal(slots.nights, 3);
  assert.equal(slots.statedPoints, 40000);
});

test('detects preference presets and soft preferences', () => {
  assert.equal(parseMessage('Find an option that uses fewer points, even if I pay slightly more cash').slots.preset, 'fewer_points');
  assert.equal(parseMessage('which needs the least cash?').slots.preset, 'lower_cash');
  const prefs = parseMessage('nonstop flights and a 5-star hotel, refundable please').slots.preferences;
  assert.deepEqual(prefs, { nonstop: true, minStars: 5, refundable: true });
});

test('classifies booking requests, policy questions and greetings', () => {
  assert.equal(parseMessage('Book the Marriott for me').intent, 'action_request');
  assert.equal(parseMessage('Do my points expire?').intent, 'policy');
  assert.equal(parseMessage('hello').intent, 'smalltalk');
});

test('asks for a destination when missing, flagging unsupported places', () => {
  const u = understand("I have 40,000 points. What's the best way to use them for a hotel stay?", null);
  const missing = missingInformation(u.intent, u.slots, u.parsed);
  assert.equal(missing.field, 'destination');

  const paris = understand('Hotel stay in Paris with my points', null);
  assert.match(missingInformation(paris.intent, paris.slots, paris.parsed).question, /Paris/);
});

test('follow-ups keep earlier slots and a bare city answers the pending question', () => {
  const first = understand('Best hotel redemption for 3 nights', null);
  const second = understand('Goa', first.slots, { pendingField: 'destination' });
  assert.equal(second.slots.destination, 'goa');
  assert.equal(second.slots.nights, 3);
  assert.equal(second.slots.category, 'hotel');

  const flight = understand('Compare flight redemptions to Mumbai', null);
  const origin = understand('Pune', flight.slots, { pendingField: 'origin' });
  assert.equal(origin.slots.origin, 'pune');
  assert.equal(origin.slots.destination, 'mumbai');
});

test('home city fills a missing flight origin as a stated assumption', () => {
  const u = understand('Flights to Goa', null, { homeCity: 'Delhi' });
  assert.equal(u.slots.origin, 'delhi');
  assert.ok(u.assumptions.some((a) => /home city/.test(a)));
});

test('"why" with earlier results is an explanation request', () => {
  const prior = understand('Hotels in Goa', null).slots;
  assert.equal(understand('Why is this redemption better than the alternative?', prior).intent, 'explain');
});
