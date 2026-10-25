// Shared, deterministic trip pricing used by the optimizer and the agent's
// sample redemption catalog. Prices are controlled sample data, not live fares.

export const CITIES = ['delhi', 'mumbai', 'bangalore', 'goa', 'hyderabad', 'chennai', 'kolkata', 'pune'];

export const FLIGHT_PRICES = {
  'delhi-mumbai': 6120,
  'delhi-bangalore': 6840,
  'delhi-goa': 5520,
  'delhi-hyderabad': 4980,
  'delhi-chennai': 7100,
  'delhi-kolkata': 4600,
  'delhi-pune': 5300,

  'mumbai-delhi': 6050,
  'mumbai-bangalore': 4900,
  'mumbai-goa': 3200,
  'mumbai-hyderabad': 4100,
  'mumbai-chennai': 5200,
  'mumbai-kolkata': 6900,
  'mumbai-pune': 3000,

  'bangalore-delhi': 6700,
  'bangalore-mumbai': 4800,
  'bangalore-goa': 4100,
  'bangalore-hyderabad': 3600,
  'bangalore-chennai': 3300,
  'bangalore-kolkata': 7200,
  'bangalore-pune': 4400,

  'goa-delhi': 5600,
  'goa-mumbai': 3100,
  'goa-bangalore': 4200,
  'goa-hyderabad': 4500,
  'goa-chennai': 4700,
  'goa-kolkata': 7400,
  'goa-pune': 3000,

  'hyderabad-delhi': 5000,
  'hyderabad-mumbai': 4200,
  'hyderabad-bangalore': 3500,
  'hyderabad-goa': 4600,
  'hyderabad-chennai': 3400,
  'hyderabad-kolkata': 6800,
  'hyderabad-pune': 3900,

  'chennai-delhi': 7050,
  'chennai-mumbai': 5100,
  'chennai-bangalore': 3200,
  'chennai-goa': 4800,
  'chennai-hyderabad': 3500,
  'chennai-kolkata': 6600,
  'chennai-pune': 4500,

  'kolkata-delhi': 4700,
  'kolkata-mumbai': 7000,
  'kolkata-bangalore': 7300,
  'kolkata-goa': 7500,
  'kolkata-hyderabad': 6700,
  'kolkata-chennai': 6500,
  'kolkata-pune': 7200,

  'pune-delhi': 5400,
  'pune-mumbai': 3000,
  'pune-bangalore': 4300,
  'pune-goa': 3100,
  'pune-hyderabad': 4000,
  'pune-chennai': 4600,
  'pune-kolkata': 7100,
};

export const HOTEL_PRICES = {
  mumbai: 4000,
  delhi: 3500,
  bangalore: 3000,
  goa: 4500,
  hyderabad: 2500,
  chennai: 2800,
  kolkata: 3000,
  pune: 3000,
};

export const DEMAND_MULTIPLIER = {
  goa: 1.3,
  mumbai: 1.2,
};

export const SUPPORTED_CITY_SET = new Set(CITIES);

export function round2(value) {
  return Number(value.toFixed(2));
}

export function normalizeCityName(value) {
  return `${value ?? ''}`.trim().toLowerCase();
}

export function deterministicVariation(seedText) {
  // Stable FNV-1a hash gives deterministic variation in the [0.9, 1.1] range.
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0) / 4294967295;
  return 0.9 + normalized * 0.2;
}

export function getTripPricing(fromRaw, toRaw) {
  const from = normalizeCityName(fromRaw);
  const to = normalizeCityName(toRaw);
  const routeKey = `${from}-${to}`;

  const flightBasePrice = FLIGHT_PRICES[routeKey] || 6000;
  const hotelBasePrice = HOTEL_PRICES[to] || 3000;

  const variation = deterministicVariation(`${routeKey}:${to}`);
  const flightPrice = round2(flightBasePrice * variation);
  const hotelPrice = round2(hotelBasePrice * variation * (DEMAND_MULTIPLIER[to] || 1));

  return {
    routeKey,
    from,
    to,
    fromSupported: SUPPORTED_CITY_SET.has(from),
    toSupported: SUPPORTED_CITY_SET.has(to),
    variation: round2(variation),
    flightPrice,
    hotelPrice,
  };
}

