import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOptionById, searchCatalog } from '../agent/catalog.js';
import { expandWalletOptions, rankRedemptions } from '../agent/scoring.js';
import { BALANCES } from './helpers.js';

const hotels = () => searchCatalog({ destination: 'goa', category: 'hotel', nights: 2 }).options;

test('value per point is (cash price − cash payable) ÷ points', () => {
  const option = getOptionById('fl:delhi-mumbai:ow:ai-saver');
  const { ranked } = rankRedemptions({ options: [option], balances: BALANCES.alice });
  const m = ranked.find((r) => r.id === option.id).metrics;
  assert.equal(m.cashAvoided, Number((option.cashPrice - option.cashComponent).toFixed(2)));
  assert.equal(m.valuePerPoint, Number((m.cashAvoided / option.pointsRequired).toFixed(4)));
  assert.equal(m.baselineValue, 0.55, 'uses the stored conversion rate as baseline');
  assert.equal(m.valueRatio, Number((m.valuePerPoint / 0.55).toFixed(3)));
  assert.equal(m.balanceAfter, 20000 - option.pointsRequired);
});

test('insufficient balance is a hard constraint, not a low score', () => {
  const result = rankRedemptions({ options: hotels(), balances: BALANCES.bob });
  const ihg = result.ineligible.find((i) => i.id === 'ht:goa:2:ihg-midscale');
  assert.ok(ihg, 'IHG option should be excluded');
  assert.match(ihg.reasons[0], /short by 15,000/);
  assert.equal(result.ranked.length, 0);
});

test('programs the user does not hold are excluded', () => {
  const result = rankRedemptions({ options: hotels(), balances: BALANCES.alice });
  const hilton = result.ineligible.find((i) => i.programName === 'Hilton Honors');
  assert.match(hilton.reasons.join(' '), /no Hilton Honors balance/);
});

test('stated points stand in only when nothing is on file', () => {
  const withStored = rankRedemptions({ options: hotels(), balances: BALANCES.bob });
  assert.equal(withStored.ranked.length, 0);
  const statedOnly = rankRedemptions({ options: hotels(), balances: [], statedPoints: 100000 });
  assert.ok(statedOnly.ranked.length > 0);
  assert.ok(statedOnly.ranked.every((r) => r.metrics.fundingSource === 'stated'));
});

test('wallet points can pay part of a fare with the rest in cash', () => {
  const base = getOptionById('ht:goa:2:bonvoy-cat4');
  const [wallet] = expandWalletOptions([base], BALANCES.alice);
  assert.equal(wallet.programType, 'wallet');
  assert.equal(wallet.pointsRequired, 15000);
  assert.equal(wallet.partialPayment, true);
  assert.equal(wallet.cashComponent, Number((base.cashPrice - 15000 * 0.5).toFixed(2)));
});

test('preference presets change the ranking deterministically', () => {
  const options = hotels();
  const value = rankRedemptions({ options, balances: BALANCES.alice, preset: 'best_value' });
  const fewer = rankRedemptions({ options, balances: BALANCES.alice, preset: 'fewer_points' });
  assert.equal(value.ranked[0].id, 'ht:goa:2:bonvoy-cat4');
  assert.ok(fewer.ranked[0].metrics.pointsRequired < value.ranked[0].metrics.pointsRequired);
  // Same inputs → identical output.
  assert.deepEqual(rankRedemptions({ options, balances: BALANCES.alice, preset: 'best_value' }), value);
});

test('score equals the weighted sum of criteria and weights sum to 1', () => {
  const { ranked, weights } = rankRedemptions({ options: hotels(), balances: BALANCES.alice });
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9);
  for (const entry of ranked) {
    const sum = Object.values(entry.contributions).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - entry.score) <= 0.1);
  }
});

test('max points / max cash limits are hard constraints', () => {
  const result = rankRedemptions({
    options: hotels(),
    balances: BALANCES.alice,
    constraints: { maxPoints: 20000 },
  });
  assert.ok(result.ranked.every((r) => r.metrics.pointsRequired <= 20000));
  assert.ok(result.ineligible.some((i) => /above your limit/.test(i.reasons.join(' '))));
});

test('preferences are soft: unmet preference lowers score but keeps the option', () => {
  const options = hotels();
  const result = rankRedemptions({ options, balances: BALANCES.alice, preferences: { minStars: 5 } });
  const cat4 = result.ranked.find((r) => r.id === 'ht:goa:2:bonvoy-cat4');
  assert.ok(cat4, 'still eligible');
  assert.equal(cat4.criteria.preference, 0);
});

test('head-to-head explains the gap between #1 and #2', () => {
  const result = rankRedemptions({ options: hotels(), balances: BALANCES.alice });
  const h = result.headToHead;
  assert.equal(h.winnerId, result.ranked[0].id);
  assert.equal(h.scoreGap, Number((result.ranked[0].score - result.ranked[1].score).toFixed(1)));
  const deltaSum = h.criteria.reduce((a, c) => a + c.delta, 0);
  assert.ok(Math.abs(deltaSum - h.scoreGap) <= 0.2);
});

test('catalog ids round-trip and unknown ids resolve to null', () => {
  for (const option of searchCatalog({ destination: 'goa', origin: 'delhi', category: 'both', nights: 3, roundTrip: true }).options) {
    assert.deepEqual(getOptionById(option.id), option);
  }
  assert.equal(getOptionById('fl:delhi-paris:ow:ai-saver'), null);
  assert.equal(getOptionById('ht:goa:2:made-up'), null);
  assert.equal(getOptionById({}), null);
});
