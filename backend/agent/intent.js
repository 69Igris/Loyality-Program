// Deterministic request understanding. Extracts trip "slots" from the user's
// message and merges them with what earlier turns established, so follow-ups
// ("use fewer points instead") keep the destination in context. The LLM can
// still choose tools, but slots pin the facts the workflow relies on.

import { CITIES, normalizeCityName } from '../lib/pricing.js';

const CITY_ALIASES = {
  bengaluru: 'bangalore',
  bombay: 'mumbai',
  'new delhi': 'delhi',
  calcutta: 'kolkata',
  madras: 'chennai',
  poona: 'pune',
};

const CITY_PATTERNS = [
  ...CITIES.map((city) => [city, city]),
  ...Object.entries(CITY_ALIASES),
].map(([text, city]) => ({ city, re: new RegExp(`\\b${text}\\b`, 'i') }));

const PREFERENCE_PATTERNS = [
  ['fewer_points', /\b(fewer|less|least|lower|minimi[sz]e|save)\s+(?:of\s+)?(?:my\s+)?(points|pts|miles)\b/i],
  ['lower_cash', /\b(less|lower|least|minimi[sz]e|min)\s+(cash|out[- ]of[- ]pocket|money)\b|\bpay(?:ing)?\s+less\s+cash\b/i],
  ['best_value', /\b(best|most|maximum|max|highest|maximi[sz]e)\s+(value|bang)\b|\bbest way to use\b/i],
];

const ACTION_RE = /\b(book|reserve|purchase|buy|pay for|transfer my|redeem (?:it|them|now)|confirm (?:the )?booking|checkout)\b/i;
const EXPLAIN_RE = /\b(why|explain|how come|what makes)\b/i;
const POLICY_RE = /\b(policy|policies|rule|rules|allowed|can i|combine|pool|expire|expiry|expiration|taxes|fees|surcharge|cancel|refund|partial|transfer partners?)\b/i;
const GREETING_RE = /^\s*(hi|hello|hey|thanks|thank you|ok|okay)\b[\s!.]*$/i;
const FOLLOW_UP_RE = /\b(this|that|these|those|it|instead|alternative|option|same|again|cheaper|another|the (?:first|second|top|best) one)\b/i;

function parseAmount(raw, suffix) {
  const base = Number(`${raw}`.replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const multiplier = /^k$/i.test(suffix || '') ? 1000 : /^(l|lakh|lac)$/i.test(suffix || '') ? 100000 : 1;
  return Math.round(base * multiplier);
}

function findCities(text) {
  const hits = [];
  for (const { city, re } of CITY_PATTERNS) {
    const match = text.match(re);
    if (match && !hits.some((h) => h.city === city)) hits.push({ city, index: match.index });
  }
  return hits.sort((a, b) => a.index - b.index);
}

function extractRoute(text) {
  const cities = findCities(text);
  const result = { origin: null, destination: null, unsupportedPlace: null };

  const fromMatch = text.match(/\bfrom\s+([a-z][a-z ]{1,24}?)(?=\s+(?:to|for|and|with|on|in)\b|[,.?!]|$)/i);
  const toMatch = text.match(/\b(?:to|in|at|visit(?:ing)?|for)\s+([a-z][a-z ]{1,24}?)(?=\s+(?:from|for|and|with|on|in|using|under|next|this)\b|[,.?!]|$)/i);

  const resolve = (phrase) => {
    if (!phrase) return null;
    const hit = findCities(phrase)[0];
    return hit ? hit.city : null;
  };

  result.origin = resolve(fromMatch?.[1]);
  result.destination = resolve(toMatch?.[1]);

  if (!result.destination) {
    const remaining = cities.filter((c) => c.city !== result.origin);
    if (remaining.length > 0) result.destination = remaining[remaining.length - 1].city;
  }
  if (!result.origin && cities.length >= 2) {
    const first = cities.find((c) => c.city !== result.destination);
    if (first) result.origin = first.city;
  }

  // Capture a place the user clearly named that we have no data for ("to Paris").
  if (!result.destination && toMatch?.[1]) {
    const word = toMatch[1].trim().split(/\s+/)[0];
    const stop = /^(a|an|the|my|me|use|stay|hotel|flight|points|fly|book|get|spend|redeem|this|that|it|them|cash|travel)$/i;
    if (/^[A-Z]/.test(word) && !stop.test(word)) result.unsupportedPlace = word;
  }
  return result;
}

function extractCategory(text) {
  const hotel = /\b(hotel|hotels|stay|stays|night|nights|accommodation|room|resort)\b/i.test(text);
  const flight = /\b(flight|flights|fly|flying|airfare|ticket|tickets|award seat|airline|round[- ]trip|one[- ]way)\b/i.test(text);
  if (hotel && flight) return 'both';
  if (hotel) return 'hotel';
  if (flight) return 'flight';
  if (/\b(trip|travel|vacation|holiday|getaway)\b/i.test(text)) return 'both';
  return null;
}

function extractNights(text) {
  const nights = text.match(/\b(\d{1,2})\s*nights?\b/i);
  if (nights) return Number(nights[1]);
  const days = text.match(/\b(\d{1,2})[- ]?days?\b/i);
  if (days) return Math.max(1, Number(days[1]) - 1);
  if (/\bweekend\b/i.test(text)) return 2;
  if (/\b(a|one) week\b/i.test(text)) return 7;
  return null;
}

function extractStatedPoints(text) {
  const match = text.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|lac)?\s*(?:points|pts|miles)\b/i);
  return match ? parseAmount(match[1], match[2]) : null;
}

function extractMaxPoints(text) {
  const match = text.match(/\b(?:under|below|at most|max(?:imum)?|no more than|within)\s+(\d[\d,]*)\s*(k)?\s*(?:points|pts|miles)\b/i);
  return match ? parseAmount(match[1], match[2]) : null;
}

function extractMaxCash(text) {
  const match = text.match(
    /\b(?:under|below|at most|max(?:imum)?|no more than|within|budget(?: of)?)\s*(?:₹|rs\.?|inr)\s*(\d[\d,]*)\s*(k|l|lakh)?\b/i,
  ) || text.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)\s*(k|l|lakh)?\s*(?:cash\s*)?(?:max|budget|limit)\b/i);
  return match ? parseAmount(match[1], match[2]) : null;
}

function extractPreferences(text) {
  const prefs = {};
  if (/\b(non[- ]?stop|direct)\b/i.test(text)) prefs.nonstop = true;
  if (/\b(5[- ]?star|five[- ]star|luxury)\b/i.test(text)) prefs.minStars = 5;
  else if (/\b(4[- ]?star|four[- ]star|upscale)\b/i.test(text)) prefs.minStars = 4;
  if (/\b(refundable|flexible|cancell?able)\b/i.test(text)) prefs.refundable = true;
  return prefs;
}

function extractPreset(text) {
  for (const [preset, re] of PREFERENCE_PATTERNS) if (re.test(text)) return preset;
  return null;
}

function classifyIntent(text, slots) {
  if (GREETING_RE.test(text)) return 'smalltalk';
  if (ACTION_RE.test(text)) return 'action_request';
  if (EXPLAIN_RE.test(text) && !slots.destination) return 'explain';
  if (POLICY_RE.test(text) && !slots.destination && !slots.category && !slots.preset) return 'policy';
  return 'recommend';
}

/** Parse a single message into raw slots (no conversation merge). */
export function parseMessage(message) {
  const text = `${message ?? ''}`;
  const route = extractRoute(text);
  const slots = {
    origin: route.origin,
    destination: route.destination,
    unsupportedPlace: route.unsupportedPlace,
    category: extractCategory(text),
    nights: extractNights(text),
    roundTrip: /\b(round[- ]?trip|return flight|return ticket|both ways)\b/i.test(text) ? true : /\bone[- ]way\b/i.test(text) ? false : null,
    statedPoints: extractStatedPoints(text),
    maxPoints: extractMaxPoints(text),
    maxCash: extractMaxCash(text),
    preferences: extractPreferences(text),
    preset: extractPreset(text),
  };
  return { intent: classifyIntent(text, slots), slots, followUp: FOLLOW_UP_RE.test(text) };
}

const EMPTY_SLOTS = {
  origin: null,
  destination: null,
  category: null,
  nights: null,
  roundTrip: null,
  statedPoints: null,
  maxPoints: null,
  maxCash: null,
  preferences: {},
  preset: null,
};

/**
 * Merge a parsed message into the slots carried by the conversation. New values
 * win; anything the user didn't restate is kept from earlier turns.
 */
export function mergeSlots(previous, parsed) {
  const base = { ...EMPTY_SLOTS, ...(previous || {}) };
  const next = { ...base };
  for (const key of Object.keys(EMPTY_SLOTS)) {
    if (key === 'preferences') continue;
    const value = parsed.slots[key];
    if (value !== null && value !== undefined) next[key] = value;
  }
  next.preferences = { ...(base.preferences || {}), ...(parsed.slots.preferences || {}) };
  // A new destination without a new category means "same kind of search, new place".
  if (parsed.slots.destination && previous?.destination && parsed.slots.destination !== previous.destination) {
    next.statedPoints = parsed.slots.statedPoints ?? base.statedPoints;
  }
  return next;
}

export function understand(message, previousSlots, { homeCity, pendingField } = {}) {
  const parsed = parseMessage(message);
  // Answering "Which city are you flying from?" with a bare city name.
  if (pendingField === 'origin' && parsed.slots.destination && !parsed.slots.origin) {
    parsed.slots.origin = parsed.slots.destination;
    parsed.slots.destination = null;
  }
  const slots = mergeSlots(previousSlots, parsed);
  let intent = parsed.intent;
  // A bare answer to a clarification continues the original request.
  if (pendingField && intent !== 'action_request' && intent !== 'smalltalk') intent = 'recommend';

  // "Why is this better?" with prior results is an explanation of the last ranking.
  if (intent === 'recommend' && parsed.followUp && EXPLAIN_RE.test(message) && previousSlots?.destination) {
    intent = 'explain';
  }
  // Nothing to explain yet: treat it as a fresh recommendation request.
  if (intent === 'explain' && !previousSlots?.destination) intent = 'recommend';

  const assumptions = [];
  if (!slots.category && slots.destination) {
    slots.category = 'both';
    assumptions.push('No flight/hotel preference given, so both were searched.');
  }
  if ((slots.category === 'hotel' || slots.category === 'both') && !slots.nights) {
    slots.nights = 2;
    assumptions.push('Assumed a 2-night stay (no length of stay given).');
  }
  if ((slots.category === 'flight' || slots.category === 'both') && !slots.origin) {
    const home = normalizeCityName(homeCity);
    if (home && CITIES.includes(home) && home !== slots.destination) {
      slots.origin = home;
      assumptions.push(`Using your home city (${home}) as the flight origin.`);
    }
  }
  if (slots.roundTrip === null && (slots.category === 'flight' || slots.category === 'both')) {
    assumptions.push('Priced flights one way (say "round trip" to include the return).');
  }

  return { intent, slots, parsed, assumptions };
}

/** Essential information still missing for the intent, as a clarification. */
export function missingInformation(intent, slots, parsed) {
  if (intent !== 'recommend') return null;
  if (!slots.destination) {
    if (parsed.slots.unsupportedPlace) {
      return {
        field: 'destination',
        question: `I only have sample redemption data for ${CITIES.length} Indian cities, and ${parsed.slots.unsupportedPlace} isn't one of them. Which of these works?`,
        choices: CITIES.map((c) => c.charAt(0).toUpperCase() + c.slice(1)),
      };
    }
    return {
      field: 'destination',
      question: 'Where are you headed? I can compare redemptions for these cities.',
      choices: CITIES.map((c) => c.charAt(0).toUpperCase() + c.slice(1)),
    };
  }
  if (slots.category === 'flight' && !slots.origin) {
    return {
      field: 'origin',
      question: 'Which city are you flying from?',
      choices: CITIES.filter((c) => c !== slots.destination).map((c) => c.charAt(0).toUpperCase() + c.slice(1)),
    };
  }
  return null;
}
