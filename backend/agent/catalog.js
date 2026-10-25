// Sample redemption catalog.
//
// The project has no live airline/hotel inventory integration, so award options
// are generated deterministically from the same controlled route pricing the
// optimizer uses (lib/pricing.js) plus an illustrative award chart. Every option
// is tagged dataSource = 'sample' so the agent and UI can say so plainly.
//
// Option ids encode their inputs (route, trip type, nights, product), which lets
// compare_redemptions re-derive an option from its id instead of trusting any
// numbers an LLM might pass along.

import {
  CITIES,
  SUPPORTED_CITY_SET,
  deterministicVariation,
  getTripPricing,
  normalizeCityName,
  round2,
} from '../lib/pricing.js';

export const SAMPLE_DATA_NOTICE =
  'Redemption options come from Ledger\'s sample award catalog (illustrative award charts over controlled route pricing). They are not live availability or live prices.';

// Reference ₹-per-point values used only when the user has no stored program to
// supply their own conversion rate.
export const PROGRAMS = {
  'air-india': {
    key: 'air-india',
    name: 'Air India Maharaja Club',
    programType: 'flight',
    referenceValue: 0.6,
    keywords: ['air india', 'maharaja', 'flying returns', 'vistara'],
  },
  indigo: {
    key: 'indigo',
    name: 'IndiGo BluChip',
    programType: 'flight',
    referenceValue: 1.0,
    keywords: ['indigo', 'bluchip', '6e'],
  },
  marriott: {
    key: 'marriott',
    name: 'Marriott Bonvoy',
    programType: 'hotel',
    referenceValue: 0.6,
    keywords: ['marriott', 'bonvoy'],
  },
  ihg: {
    key: 'ihg',
    name: 'IHG One Rewards',
    programType: 'hotel',
    referenceValue: 0.4,
    keywords: ['ihg'],
  },
  hilton: {
    key: 'hilton',
    name: 'Hilton Honors',
    programType: 'hotel',
    referenceValue: 0.3,
    keywords: ['hilton'],
  },
};

export function matchProgramKey(programName) {
  const text = `${programName ?? ''}`.toLowerCase();
  for (const program of Object.values(PROGRAMS)) {
    if (program.keywords.some((keyword) => text.includes(keyword))) return program.key;
  }
  return null;
}

function distanceBand(price) {
  if (price < 4000) return 'short';
  if (price < 6000) return 'medium';
  return 'long';
}

const SAVER_CHART = {
  short: { points: 5000, taxes: 650 },
  medium: { points: 8000, taxes: 850 },
  long: { points: 11000, taxes: 1100 },
};

function isNonstop(routeKey, product) {
  return deterministicVariation(`${routeKey}:${product}:nonstop`) >= 0.96;
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

const FLIGHT_PRODUCTS = [
  {
    product: 'ai-saver',
    programKey: 'air-india',
    title: 'Economy saver award',
    walletBase: true,
    build: (price) => {
      const chart = SAVER_CHART[distanceBand(price)];
      return { cashPrice: price, pointsRequired: chart.points, cashComponent: chart.taxes, refundable: false };
    },
  },
  {
    product: 'ai-flex',
    programKey: 'air-india',
    title: 'Economy flexible award',
    build: (price) => {
      const chart = SAVER_CHART[distanceBand(price)];
      return {
        cashPrice: round2(price * 1.35),
        pointsRequired: roundTo(chart.points * 1.8, 500),
        cashComponent: chart.taxes,
        refundable: true,
      };
    },
  },
  {
    product: '6e-bluchip',
    programKey: 'indigo',
    title: 'BluChip fare redemption',
    build: (price) => ({
      cashPrice: price,
      pointsRequired: roundTo(price * 0.92, 100),
      cashComponent: 720,
      refundable: false,
    }),
  },
];

const HOTEL_PRODUCTS = [
  {
    product: 'bonvoy-cat4',
    programKey: 'marriott',
    title: 'Category 4 upscale hotel',
    stars: 4,
    walletBase: true,
    build: (nightly) => ({ cashPerNight: nightly * 1.6, pointsPerNight: 12000 }),
  },
  {
    product: 'bonvoy-cat6',
    programKey: 'marriott',
    title: 'Category 6 luxury hotel',
    stars: 5,
    build: (nightly) => ({ cashPerNight: nightly * 3.2, pointsPerNight: 30000 }),
  },
  {
    product: 'ihg-midscale',
    programKey: 'ihg',
    title: 'Mid-scale hotel',
    stars: 3,
    build: (nightly) => ({ cashPerNight: nightly, pointsPerNight: 10000 }),
  },
  {
    product: 'hilton-upscale',
    programKey: 'hilton',
    title: 'Upscale hotel',
    stars: 4,
    fifthNightFree: true,
    build: (nightly) => ({ cashPerNight: nightly * 1.4, pointsPerNight: 20000 }),
  },
];

function cityLabel(city) {
  return city.charAt(0).toUpperCase() + city.slice(1);
}

function buildFlightOption(from, to, roundTrip, spec) {
  const legs = roundTrip ? [[from, to], [to, from]] : [[from, to]];
  let cashPrice = 0;
  let pointsRequired = 0;
  let cashComponent = 0;
  let nonstop = true;
  let refundable = false;

  for (const [legFrom, legTo] of legs) {
    const pricing = getTripPricing(legFrom, legTo);
    const leg = spec.build(pricing.flightPrice);
    cashPrice += leg.cashPrice;
    pointsRequired += leg.pointsRequired;
    cashComponent += leg.cashComponent;
    refundable = leg.refundable;
    nonstop = nonstop && isNonstop(pricing.routeKey, spec.programKey);
  }

  const program = PROGRAMS[spec.programKey];
  return {
    id: `fl:${from}-${to}:${roundTrip ? 'rt' : 'ow'}:${spec.product}`,
    category: 'flight',
    programKey: program.key,
    programName: program.name,
    programType: program.programType,
    title: `${spec.title}${roundTrip ? ' · round trip' : ' · one way'}`,
    origin: from,
    destination: to,
    roundTrip,
    nights: null,
    cashPrice: round2(cashPrice),
    pointsRequired,
    cashComponent: round2(cashComponent),
    attributes: { nonstop, refundable, cabin: 'economy' },
    walletBase: Boolean(spec.walletBase),
    dataSource: 'sample',
    reliability: 0.6,
  };
}

function buildHotelOption(city, nights, spec) {
  const pricing = getTripPricing(city, city);
  const { cashPerNight, pointsPerNight } = spec.build(pricing.hotelPrice);
  const paidNights = spec.fifthNightFree ? nights - Math.floor(nights / 5) : nights;
  const program = PROGRAMS[spec.programKey];

  return {
    id: `ht:${city}:${nights}:${spec.product}`,
    category: 'hotel',
    programKey: program.key,
    programName: program.name,
    programType: program.programType,
    title: `${spec.title} · ${nights} night${nights === 1 ? '' : 's'}`,
    origin: null,
    destination: city,
    roundTrip: false,
    nights,
    cashPrice: round2(cashPerNight * nights),
    pointsRequired: pointsPerNight * paidNights,
    cashComponent: 0,
    attributes: {
      stars: spec.stars,
      refundable: true,
      fifthNightFree: Boolean(spec.fifthNightFree),
      pointsPerNight,
    },
    walletBase: Boolean(spec.walletBase),
    dataSource: 'sample',
    reliability: 0.6,
  };
}

export function isSupportedCity(city) {
  return SUPPORTED_CITY_SET.has(normalizeCityName(city));
}

export const SUPPORTED_CITIES = CITIES.map(cityLabel);

// Returns { options, notices }. Throws on unsupported input so the tool layer
// can surface a clean validation error.
export function searchCatalog({ destination, origin, category = 'both', nights = 2, roundTrip = false }) {
  const to = normalizeCityName(destination);
  if (!SUPPORTED_CITY_SET.has(to)) {
    throw new Error(`No sample inventory for "${destination}". Supported cities: ${SUPPORTED_CITIES.join(', ')}.`);
  }

  const options = [];
  const notices = [];

  if (category === 'flight' || category === 'both') {
    const from = normalizeCityName(origin);
    if (!from) {
      notices.push('Flight options skipped: an origin city is required.');
    } else if (!SUPPORTED_CITY_SET.has(from)) {
      notices.push(`Flight options skipped: no sample routes from "${origin}".`);
    } else if (from === to) {
      notices.push('Flight options skipped: origin and destination are the same city.');
    } else {
      for (const spec of FLIGHT_PRODUCTS) options.push(buildFlightOption(from, to, roundTrip, spec));
    }
  }

  if (category === 'hotel' || category === 'both') {
    for (const spec of HOTEL_PRODUCTS) options.push(buildHotelOption(to, nights, spec));
  }

  return { options, notices };
}

const FLIGHT_ID = /^fl:([a-z]+)-([a-z]+):(ow|rt):([a-z0-9-]+)$/;
const HOTEL_ID = /^ht:([a-z]+):(\d{1,2}):([a-z0-9-]+)$/;

// Re-derive a catalog option from its id. Returns null for anything unknown.
export function getOptionById(id) {
  if (typeof id !== 'string' || id.length > 80) return null;

  const flight = id.match(FLIGHT_ID);
  if (flight) {
    const [, from, to, tripType, product] = flight;
    const spec = FLIGHT_PRODUCTS.find((p) => p.product === product);
    if (!spec || !SUPPORTED_CITY_SET.has(from) || !SUPPORTED_CITY_SET.has(to) || from === to) return null;
    return buildFlightOption(from, to, tripType === 'rt', spec);
  }

  const hotel = id.match(HOTEL_ID);
  if (hotel) {
    const [, city, nightsRaw, product] = hotel;
    const nights = Number(nightsRaw);
    const spec = HOTEL_PRODUCTS.find((p) => p.product === product);
    if (!spec || !SUPPORTED_CITY_SET.has(city) || nights < 1 || nights > 30) return null;
    return buildHotelOption(city, nights, spec);
  }

  return null;
}
