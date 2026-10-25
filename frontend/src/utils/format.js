export function formatINR(value, digits = 2) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount)}`;
}

export function formatPoints(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(amount));
}

export function titleCase(text) {
  if (!text) return '';
  return `${text}`.charAt(0).toUpperCase() + `${text}`.slice(1);
}

export const TOOL_LABELS = {
  get_loyalty_balance: 'Loyalty balances',
  search_redemption_options: 'Search redemptions',
  compare_redemptions: 'Compare & score',
  get_recommendation_context: 'Policy retrieval',
};

export const CRITERION_LABELS = {
  value: 'Value per point',
  cash: 'Cash coverage',
  points: 'Points required',
  preference: 'Preference match',
  reliability: 'Data reliability',
};

export const PRESET_LABELS = {
  balanced: 'Balanced',
  best_value: 'Best value',
  fewer_points: 'Fewer points',
  lower_cash: 'Lower cash',
};
