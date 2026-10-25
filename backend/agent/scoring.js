// Deterministic redemption math and ranking. The LLM never computes numbers:
// every figure the agent shows comes from these functions.
//
// Criterion scores (0–1):
//   value       = option's value ratio ÷ best value ratio in the set
//   points      = fewest points in the set ÷ option's points
//   cash        = 1 − cash payable ÷ cash price
//   preference  = share of stated preferences met (1 when none stated)
//   reliability = data-source reliability (sample catalog = 0.6)
// score = 100 × Σ weight × criterion.
//
// Pipeline: expand wallet options → fund each option from a balance → compute
// metrics → apply hard constraints → score eligible options with a transparent
// weighted sum → explain the ranking.

import { round2 } from '../lib/pricing.js';
import { PROGRAMS, matchProgramKey } from './catalog.js';
import { DEFAULT_WEIGHT_PRESETS, SCORING_CRITERIA } from './config.js';

export const CRITERION_LABELS = {
  value: 'Value per point',
  cash: 'Cash coverage',
  points: 'Points required',
  preference: 'Preference match',
  reliability: 'Data reliability',
};

export function formatINR(value) {
  const amount = Number(value) || 0;
  return `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}

export function formatInt(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
}

function slugify(text) {
  return `${text}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'wallet';
}

// Flexible wallet / card points can pay any cash fare at the stored conversion
// rate, including partially (the rest is paid in cash). We synthesise one such
// option per wallet balance for each "wallet base" catalog product.
export function expandWalletOptions(options, balances) {
  const wallets = balances.filter((b) => b.programType === 'wallet' && b.points > 0 && b.valuePerPoint > 0);
  const expanded = [];
  for (const base of options) {
    if (!base.walletBase) continue;
    for (const wallet of wallets) {
      const pointsNeeded = Math.ceil(base.cashPrice / wallet.valuePerPoint);
      const pointsUsed = Math.min(Math.floor(wallet.points), pointsNeeded);
      const cashComponent = round2(Math.max(0, base.cashPrice - pointsUsed * wallet.valuePerPoint));
      expanded.push({
        ...base,
        id: `wallet:${slugify(wallet.name)}:${base.id}`,
        programKey: null,
        programName: wallet.name,
        programType: 'wallet',
        title: `${base.title} · paid with ${wallet.name}`,
        pointsRequired: pointsUsed,
        cashComponent,
        walletBase: false,
        partialPayment: pointsUsed < pointsNeeded,
        fundedBy: wallet.name,
      });
    }
  }
  return expanded;
}

// Pick the balance that funds an option. Award options need points in the
// matching program; wallet options are funded by the wallet they were built from.
function findFunding(option, balances, statedPoints) {
  if (option.programType === 'wallet') {
    const wallet = balances.find((b) => b.name === option.fundedBy);
    return wallet ? { ...wallet, source: 'stored' } : null;
  }

  const matches = balances
    .filter((b) => b.programType !== 'wallet' && (b.programKey ?? matchProgramKey(b.name)) === option.programKey)
    .sort((a, b) => b.points - a.points);
  if (matches.length > 0) return { ...matches[0], source: 'stored' };

  if (Number.isFinite(statedPoints) && statedPoints > 0) {
    return {
      name: option.programName,
      programType: option.programType,
      points: statedPoints,
      valuePerPoint: PROGRAMS[option.programKey]?.referenceValue ?? null,
      source: 'stated',
    };
  }
  return null;
}

function computeMetrics(option, funding) {
  const pointsRequired = option.pointsRequired;
  const cashAvoided = round2(Math.max(0, option.cashPrice - option.cashComponent));
  const valuePerPoint = pointsRequired > 0 ? Number((cashAvoided / pointsRequired).toFixed(4)) : 0;

  const storedRate = funding?.source === 'stored' ? funding.valuePerPoint : null;
  const baselineValue =
    storedRate && storedRate > 0 ? storedRate : PROGRAMS[option.programKey]?.referenceValue ?? null;
  const baselineSource = storedRate && storedRate > 0 ? 'your stored conversion rate' : 'sample reference value';
  const valueRatio = baselineValue ? Number((valuePerPoint / baselineValue).toFixed(3)) : 1;

  const balance = funding ? funding.points : 0;
  return {
    cashPrice: option.cashPrice,
    pointsRequired,
    cashPayable: option.cashComponent,
    cashAvoided,
    valuePerPoint,
    baselineValue,
    baselineSource,
    valueRatio,
    balance,
    balanceAfter: funding ? round2(balance - pointsRequired) : null,
    fundingProgram: funding?.name ?? null,
    fundingSource: funding?.source ?? null,
  };
}

function hardConstraintFailures(option, metrics, funding, constraints) {
  const reasons = [];
  if (constraints.category && constraints.category !== 'both' && option.category !== constraints.category) {
    reasons.push(`Not a ${constraints.category} redemption.`);
  }
  if (constraints.destination && option.destination !== constraints.destination) {
    reasons.push(`Destination is ${option.destination}, not ${constraints.destination}.`);
  }
  if (!(metrics.pointsRequired > 0)) {
    reasons.push('Option requires no points, so it is not a redemption.');
  }
  if (!funding) {
    reasons.push(`You have no ${option.programName} balance on file.`);
  } else if (metrics.balance < metrics.pointsRequired) {
    reasons.push(
      `Needs ${formatInt(metrics.pointsRequired)} ${funding.name} points; balance is ${formatInt(
        metrics.balance,
      )} (short by ${formatInt(metrics.pointsRequired - metrics.balance)}).`,
    );
  }
  if (Number.isFinite(constraints.maxPoints) && metrics.pointsRequired > constraints.maxPoints) {
    reasons.push(`Uses ${formatInt(metrics.pointsRequired)} points, above your limit of ${formatInt(constraints.maxPoints)}.`);
  }
  if (Number.isFinite(constraints.maxCash) && metrics.cashPayable > constraints.maxCash) {
    reasons.push(`Cash payable ${formatINR(metrics.cashPayable)} exceeds your limit of ${formatINR(constraints.maxCash)}.`);
  }
  return reasons;
}

function preferenceMatch(option, preferences = {}) {
  const checks = [];
  if (preferences.nonstop && option.category === 'flight') {
    checks.push({ label: 'nonstop', met: Boolean(option.attributes?.nonstop) });
  }
  if (Number.isFinite(preferences.minStars) && option.category === 'hotel') {
    checks.push({ label: `${preferences.minStars}+ stars`, met: (option.attributes?.stars ?? 0) >= preferences.minStars });
  }
  if (preferences.refundable) {
    checks.push({ label: 'refundable', met: Boolean(option.attributes?.refundable) });
  }
  if (checks.length === 0) return { score: 1, met: [], unmet: [] };
  const met = checks.filter((c) => c.met).map((c) => c.label);
  const unmet = checks.filter((c) => !c.met).map((c) => c.label);
  return { score: met.length / checks.length, met, unmet };
}

export function resolveWeights(preset, weightPresets = DEFAULT_WEIGHT_PRESETS) {
  const name = preset in weightPresets ? preset : 'balanced';
  return { preset: name, weights: weightPresets[name] };
}

function criterionScores(entries) {
  const maxRatio = Math.max(...entries.map((e) => e.metrics.valueRatio));
  const minPoints = Math.min(...entries.map((e) => e.metrics.pointsRequired));

  for (const entry of entries) {
    const { metrics } = entry;
    entry.criteria = {
      value: maxRatio > 0 ? metrics.valueRatio / maxRatio : 0,
      points: metrics.pointsRequired > 0 ? minPoints / metrics.pointsRequired : 0,
      // Share of the cash price that points cover (1 = nothing left to pay in cash).
      cash: metrics.cashPrice > 0 ? Math.max(0, 1 - metrics.cashPayable / metrics.cashPrice) : 0,
      preference: entry.preference.score,
      reliability: entry.option.reliability ?? 0.5,
    };
    for (const key of SCORING_CRITERIA) entry.criteria[key] = Number(entry.criteria[key].toFixed(4));
  }
}

function weightedScore(criteria, weights) {
  let total = 0;
  const contributions = {};
  for (const key of SCORING_CRITERIA) {
    const contribution = (weights[key] ?? 0) * criteria[key] * 100;
    contributions[key] = Number(contribution.toFixed(2));
    total += contribution;
  }
  return { score: Number(total.toFixed(1)), contributions };
}

function highlightReasons(entry, ranked) {
  const reasons = [];
  const { metrics, criteria } = entry;
  if (ranked.length > 1 && criteria.value === 1) {
    reasons.push(
      `Best value in the set: ${formatINR(metrics.valuePerPoint)} per point (${metrics.valueRatio}× ${metrics.baselineSource}).`,
    );
  }
  if (ranked.length > 1 && criteria.points === 1) {
    reasons.push(`Fewest points required: ${formatInt(metrics.pointsRequired)}.`);
  }
  if (ranked.length > 1 && metrics.cashPayable === Math.min(...ranked.map((r) => r.metrics.cashPayable))) {
    reasons.push(`Lowest cash payable: ${formatINR(metrics.cashPayable)}.`);
  }
  if (entry.preference.met.length > 0) reasons.push(`Matches your preferences: ${entry.preference.met.join(', ')}.`);
  if (entry.preference.unmet.length > 0) reasons.push(`Does not meet: ${entry.preference.unmet.join(', ')}.`);
  if (metrics.fundingSource === 'stated') {
    reasons.push('Balance check uses the points you mentioned, not a stored balance.');
  }
  if (entry.option.partialPayment) {
    reasons.push(`Balance covers part of the fare; ${formatINR(metrics.cashPayable)} is paid in cash.`);
  }
  if (metrics.valueRatio < 1) {
    reasons.push(`Below ${metrics.baselineSource} (${formatINR(metrics.baselineValue)}/pt): consider paying cash instead.`);
  }
  return reasons;
}

export function buildCalculations(entry) {
  const { metrics, option } = entry;
  const calcs = [
    {
      label: 'Cash avoided',
      formula: `${formatINR(metrics.cashPrice)} cash price − ${formatINR(metrics.cashPayable)} cash payable`,
      result: formatINR(metrics.cashAvoided),
    },
    {
      label: 'Value per point',
      formula: `${formatINR(metrics.cashAvoided)} ÷ ${formatInt(metrics.pointsRequired)} points`,
      result: `${formatINR(metrics.valuePerPoint)}/pt`,
    },
  ];
  if (metrics.baselineValue) {
    calcs.push({
      label: 'Versus baseline',
      formula: `${formatINR(metrics.valuePerPoint)} ÷ ${formatINR(metrics.baselineValue)} (${metrics.baselineSource})`,
      result: `${metrics.valueRatio}×`,
    });
  }
  if (metrics.balanceAfter !== null) {
    calcs.push({
      label: 'Balance after',
      formula: `${formatInt(metrics.balance)} − ${formatInt(metrics.pointsRequired)} ${option.programName} points`,
      result: formatInt(metrics.balanceAfter),
    });
  }
  return calcs;
}

function headToHead(first, second, weights) {
  if (!first || !second) return null;
  const criteria = SCORING_CRITERIA.map((key) => ({
    criterion: key,
    label: CRITERION_LABELS[key],
    weight: weights[key],
    delta: Number((first.contributions[key] - second.contributions[key]).toFixed(2)),
  })).sort((a, b) => b.delta - a.delta);

  return {
    winnerId: first.option.id,
    runnerUpId: second.option.id,
    scoreGap: Number((first.score - second.score).toFixed(1)),
    pointsDelta: second.metrics.pointsRequired - first.metrics.pointsRequired,
    cashDelta: round2(second.metrics.cashPayable - first.metrics.cashPayable),
    valuePerPointDelta: Number((first.metrics.valuePerPoint - second.metrics.valuePerPoint).toFixed(4)),
    criteria,
  };
}

function publicEntry(entry, rank) {
  const { option } = entry;
  return {
    rank,
    id: option.id,
    category: option.category,
    title: option.title,
    programName: option.programName,
    programType: option.programType,
    origin: option.origin,
    destination: option.destination,
    nights: option.nights,
    roundTrip: option.roundTrip,
    attributes: option.attributes,
    dataSource: option.dataSource,
    partialPayment: Boolean(option.partialPayment),
    metrics: entry.metrics,
    criteria: entry.criteria,
    contributions: entry.contributions,
    score: entry.score,
    reasons: entry.reasons,
  };
}

/**
 * Rank redemption options for a user.
 * @param {object} input
 * @param {object[]} input.options catalog options (already resolved server-side)
 * @param {object[]} input.balances [{ name, programType, points, valuePerPoint, programKey? }]
 * @param {object} [input.constraints] { category, destination, maxPoints, maxCash }
 * @param {object} [input.preferences] { nonstop, minStars, refundable }
 * @param {string} [input.preset] weight preset name
 * @param {number} [input.statedPoints] user-stated points used only when no stored balance matches
 */
export function rankRedemptions({
  options,
  balances = [],
  constraints = {},
  preferences = {},
  preset = 'balanced',
  statedPoints,
  weightPresets,
}) {
  const { preset: presetName, weights } = resolveWeights(preset, weightPresets);
  const candidates = [...options, ...expandWalletOptions(options, balances)];

  const eligible = [];
  const ineligible = [];
  for (const option of candidates) {
    const funding = findFunding(option, balances, statedPoints);
    const metrics = computeMetrics(option, funding);
    const failures = hardConstraintFailures(option, metrics, funding, constraints);
    if (failures.length > 0) {
      ineligible.push({
        id: option.id,
        title: option.title,
        programName: option.programName,
        category: option.category,
        pointsRequired: metrics.pointsRequired,
        cashPayable: metrics.cashPayable,
        reasons: failures,
      });
      continue;
    }
    eligible.push({ option, metrics, preference: preferenceMatch(option, preferences) });
  }

  if (eligible.length > 0) {
    criterionScores(eligible);
    for (const entry of eligible) Object.assign(entry, weightedScore(entry.criteria, weights));
    eligible.sort(
      (a, b) =>
        b.score - a.score ||
        b.metrics.valueRatio - a.metrics.valueRatio ||
        a.option.id.localeCompare(b.option.id),
    );
    for (const entry of eligible) entry.reasons = highlightReasons(entry, eligible);
  }

  return {
    preset: presetName,
    weights,
    ranked: eligible.map((entry, index) => publicEntry(entry, index + 1)),
    ineligible,
    headToHead: headToHead(eligible[0], eligible[1], weights),
    calculations: eligible[0] ? buildCalculations(eligible[0]) : [],
  };
}
