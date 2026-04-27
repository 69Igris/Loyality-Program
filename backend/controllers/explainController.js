const CITIES = ['delhi', 'mumbai', 'bangalore', 'goa', 'hyderabad', 'chennai', 'kolkata', 'pune'];

const FLIGHT_PRICES = {
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

const HOTEL_PRICES = {
  mumbai: 4000,
  delhi: 3500,
  bangalore: 3000,
  goa: 4500,
  hyderabad: 2500,
  chennai: 2800,
  kolkata: 3000,
  pune: 3000,
};

const DEMAND_MULTIPLIER = {
  goa: 1.3,
  mumbai: 1.2,
};

import { prisma } from '../lib/prisma.js';

const RAG_SERVICE_URL = (process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const SUPPORTED_CITY_SET = new Set(CITIES);

// Hydrate { cards, loyalty_programs } payload from the authenticated user's stored profile.
async function loadUserProfile(userId) {
  const [cards, programs] = await Promise.all([
    prisma.card.findMany({ where: { userId } }),
    prisma.loyaltyProgram.findMany({ where: { userId } }),
  ]);

  return {
    cards: cards.map((card) => ({
      name: card.name,
      earn_rate_spend: card.earnRateSpend,
      earn_rate_points: card.earnRatePoints,
      point_value: card.pointValue,
      current_points: card.currentPoints ?? 0,
    })),
    loyalty_programs: programs.map((program) => ({
      name: program.name,
      points: program.points,
      conversion_rate: program.conversionRate,
      type: program.programType,
    })),
  };
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (parsed) {
      return Number(parsed[0]);
    }
  }

  return NaN;
}

function round2(value) {
  return Number(value.toFixed(2));
}

function formatCurrency(value) {
  const rounded = round2(value);
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(rounded)}`;
}

function normalizeCityName(value) {
  return `${value ?? ''}`.trim().toLowerCase();
}

function formatPoints(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(round2(value));
}

function getBoundedRedemption(availablePoints, conversionRate, price) {
  const safeAvailablePoints = Number.isFinite(availablePoints) && availablePoints > 0 ? availablePoints : 0;
  const safeConversionRate = Number.isFinite(conversionRate) && conversionRate > 0 ? conversionRate : 0;
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;

  if (safeAvailablePoints === 0 || safeConversionRate === 0 || safePrice === 0) {
    return {
      maxPointsUsable: 0,
      pointsUsed: 0,
      pointsValueUsed: 0,
      remainingCost: round2(safePrice),
    };
  }

  // Bounded redemption: pointsUsed = min(availablePoints, price / conversionRate)
  const maxPointsUsable = safePrice / safeConversionRate;
  const pointsUsed = Math.min(safeAvailablePoints, maxPointsUsable);
  const pointsValueUsed = pointsUsed * safeConversionRate;
  const remainingCost = Math.max(0, safePrice - pointsValueUsed);

  return {
    maxPointsUsable: round2(maxPointsUsable),
    pointsUsed: round2(pointsUsed),
    pointsValueUsed: round2(pointsValueUsed),
    remainingCost: round2(remainingCost),
  };
}

function deterministicVariation(seedText) {
  // Stable FNV-1a hash gives deterministic variation in the [0.9, 1.1] range.
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0) / 4294967295;
  return 0.9 + normalized * 0.2;
}

function getTripPricing(fromRaw, toRaw) {
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

function rewardValue(spend, earnRateSpend, earnRatePoints, pointValue) {
  return (spend / earnRateSpend) * earnRatePoints * pointValue;
}

const FLIGHT_TYPE_KEYS = ['flight', 'airline', 'mile', 'miles', 'vistara', 'air india', 'indigo'];
const HOTEL_TYPE_KEYS = ['hotel', 'stay', 'accommodation', 'marriott', 'hilton', 'airbnb'];
const WALLET_TYPE_KEYS = ['wallet', 'mmt', 'makemytrip', 'travel wallet', 'flex'];

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyProgramType(rawProgram, name) {
  const declaredType = `${
    rawProgram.type ?? rawProgram.program_type ?? rawProgram.programType ?? rawProgram.category ?? ''
  }`
    .toLowerCase()
    .trim();

  if (declaredType === 'flight' || includesAny(declaredType, FLIGHT_TYPE_KEYS)) {
    return 'flight';
  }
  if (declaredType === 'hotel' || includesAny(declaredType, HOTEL_TYPE_KEYS)) {
    return 'hotel';
  }
  if (declaredType === 'wallet' || includesAny(declaredType, WALLET_TYPE_KEYS)) {
    return 'wallet';
  }

  const normalizedName = `${name}`.toLowerCase();
  if (includesAny(normalizedName, FLIGHT_TYPE_KEYS)) {
    return 'flight';
  }
  if (includesAny(normalizedName, HOTEL_TYPE_KEYS)) {
    return 'hotel';
  }

  return 'wallet';
}

function extractEarnRate(card) {
  const directSpend = toNumber(
    card.earn_rate_spend ?? card.earnRateSpend ?? card.spend_per_unit ?? card.spendPerUnit,
  );
  const directPoints = toNumber(
    card.earn_rate_points ?? card.earnRatePoints ?? card.points_per_unit ?? card.pointsPerUnit,
  );

  if (
    Number.isFinite(directSpend) &&
    Number.isFinite(directPoints) &&
    directSpend > 0 &&
    directPoints > 0
  ) {
    return { earnRateSpend: directSpend, earnRatePoints: directPoints };
  }

  const textSources = [
    card.earn_rate,
    card.earnRate,
    card.reward_rate,
    card.rewardRate,
    card.rewards,
    card.description,
  ];

  for (const text of textSources) {
    if (typeof text !== 'string') {
      continue;
    }

    const pointsThenSpend = text.match(
      /(\d+(?:\.\d+)?)\s*(?:points?|pts?)\s*(?:per|\/)\s*(?:inr|rs\.?\s*)?(\d+(?:\.\d+)?)/i,
    );
    if (pointsThenSpend) {
      return {
        earnRatePoints: Number(pointsThenSpend[1]),
        earnRateSpend: Number(pointsThenSpend[2]),
      };
    }

    const spendThenPoints = text.match(
      /(?:inr|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:spend)?\s*(?:=|gives?|earns?)\s*(\d+(?:\.\d+)?)\s*(?:points?|pts?)/i,
    );
    if (spendThenPoints) {
      return {
        earnRateSpend: Number(spendThenPoints[1]),
        earnRatePoints: Number(spendThenPoints[2]),
      };
    }
  }

  return null;
}

function buildLoyaltyPrograms(rawPrograms) {
  return rawPrograms
    .map((program, index) => {
      const points = toNumber(program.points);
      const conversionRate = toNumber(program.conversion_rate ?? program.conversionRate);

      if (!Number.isFinite(points) || !Number.isFinite(conversionRate) || points <= 0 || conversionRate <= 0) {
        return null;
      }

      const name = program.name || program.program_name || `Loyalty Program ${index + 1}`;
      const programType = classifyProgramType(program, name);

      return {
        name,
        points,
        conversionRate,
        remainingPoints: points,
        pointsValue: round2(points * conversionRate),
        programType,
      };
    })
    .filter(Boolean);
}

function buildCards(rawCards, flightPrice) {
  return rawCards
    .map((card, index) => {
      const earnRate = extractEarnRate(card);
      const pointValue = toNumber(card.point_value ?? card.pointValue ?? card.value_per_point ?? card.valuePerPoint);

      if (!earnRate || !Number.isFinite(pointValue) || pointValue <= 0) {
        return null;
      }

      const cardRewardValue = rewardValue(
        flightPrice,
        earnRate.earnRateSpend,
        earnRate.earnRatePoints,
        pointValue,
      );

      return {
        name: card.name || card.card_name || `Card ${index + 1}`,
        earnRateSpend: earnRate.earnRateSpend,
        earnRatePoints: earnRate.earnRatePoints,
        pointValue,
        cardRewardValue: round2(cardRewardValue),
      };
    })
    .filter(Boolean);
}

export async function explainLoyalty(req, res) {
  try {
    let { userData, trip } = req.body ?? {};

    req.log.debug({ body: req.body }, '[optimizer] incoming payload');

    if (!trip || typeof trip.from !== 'string' || typeof trip.to !== 'string') {
      req.log.warn('[optimizer] Invalid trip in request body');
      return res.status(400).json({
        error: 'Invalid input. Expected { trip: { from, to } } (and optionally userData).',
      });
    }

    // If the caller is authenticated and didn't ship userData, hydrate from their saved profile.
    // We intentionally treat "userData provided but partial" (e.g. cards-only) as valid, so the
    // hydration trigger is "no userData at all".
    if (!userData && req.user) {
      try {
        userData = await loadUserProfile(req.user.id);
        req.log.debug({ userId: req.user.id }, '[optimizer] loaded saved profile');
      } catch (profileError) {
        req.log.error({ err: profileError }, '[optimizer] failed to load saved profile');
        return res.status(500).json({ error: 'Could not load your saved profile.' });
      }
    }

    // Normalize: missing arrays default to [] so cards-only or programs-only payloads are valid.
    if (!userData || typeof userData !== 'object') {
      userData = {};
    }
    if (!Array.isArray(userData.cards)) userData.cards = [];
    if (!Array.isArray(userData.loyalty_programs)) userData.loyalty_programs = [];

    const pricing = getTripPricing(trip.from, trip.to);
    const totalCost = round2(pricing.flightPrice + pricing.hotelPrice);

    req.log.debug({ pricing }, '[optimizer] pricing context');

    const loyaltyPrograms = buildLoyaltyPrograms(userData.loyalty_programs);
    const cards = buildCards(userData.cards, pricing.flightPrice);

    // Promote each card's accumulated reward balance into a wallet-flexible
    // loyalty pool so it actually redeems against the trip. Card-issuer points
    // are typically convertible to travel credits, so wallet treatment is the
    // safe default.
    const cardBalancePrograms = (userData.cards || [])
      .map((rawCard, index) => {
        const balance = toNumber(rawCard.current_points ?? rawCard.currentPoints ?? 0);
        const value = toNumber(rawCard.point_value ?? rawCard.pointValue ?? 0);
        if (!Number.isFinite(balance) || balance <= 0 || !Number.isFinite(value) || value <= 0) {
          return null;
        }
        const cardName = rawCard.name || rawCard.card_name || `Card ${index + 1}`;
        return {
          name: `${cardName} balance`,
          points: balance,
          conversionRate: value,
          remainingPoints: balance,
          pointsValue: round2(balance * value),
          programType: 'wallet',
        };
      })
      .filter(Boolean);

    if (cardBalancePrograms.length > 0) {
      loyaltyPrograms.push(...cardBalancePrograms);
    }

    // Capture profile-shape notes so the UI can surface "you have no programs yet" gracefully.
    const profileNotes = [];
    if (loyaltyPrograms.length === 0 && cards.length === 0) {
      profileNotes.push(
        'No loyalty programs or cards on file — showing the cash baseline. Add a card or program to start saving.',
      );
    } else if (loyaltyPrograms.length === 0) {
      profileNotes.push('No loyalty programs on file — only card rewards apply on this trip.');
    } else if (cards.length === 0) {
      profileNotes.push('No cards on file — only point redemption applies; remaining balance is paid in cash.');
    }

    const sortedPrograms = [...loyaltyPrograms].sort((a, b) => b.conversionRate - a.conversionRate);
    const sortedCards = [...cards].sort((a, b) => b.cardRewardValue - a.cardRewardValue);
    const programTypes = Object.fromEntries(sortedPrograms.map((program) => [program.name, program.programType]));

    let flightRemaining = pricing.flightPrice;
    let hotelRemaining = pricing.hotelPrice;
    let totalPointsUsed = 0;
    let totalFlightPointsValueUsed = 0;
    let totalHotelPointsValueUsed = 0;

    const flightPlan = [];
    const hotelPlan = [];
    const usage = {
      flight: [],
      hotel: [],
    };
    const pointsBreakdown = [];

    for (const program of sortedPrograms) {
      const canUseForFlight = program.programType === 'flight' || program.programType === 'wallet';
      const canUseForHotel = program.programType === 'hotel' || program.programType === 'wallet';

      const breakdown = {
        programName: program.name,
        usedForFlight: 0,
        usedForHotel: 0,
        remainingPoints: round2(program.remainingPoints),
      };

      if (canUseForFlight && flightRemaining > 0) {
        const availablePoints = program.remainingPoints;
        const redemption = getBoundedRedemption(availablePoints, program.conversionRate, flightRemaining);

        if (redemption.pointsUsed > 0) {
          program.remainingPoints = round2(Math.max(0, availablePoints - redemption.pointsUsed));
          flightRemaining = redemption.remainingCost;
          totalPointsUsed += redemption.pointsUsed;
          totalFlightPointsValueUsed += redemption.pointsValueUsed;
          breakdown.usedForFlight = redemption.pointsUsed;

          const line = `Use ${formatPoints(redemption.pointsUsed)} ${program.name} points (${formatCurrency(
            redemption.pointsValueUsed,
          )} value)`;
          flightPlan.push(line);
          usage.flight.push({
            program: program.name,
            type: program.programType,
            availablePoints: round2(availablePoints),
            conversionRate: program.conversionRate,
            maxPointsUsable: redemption.maxPointsUsable,
            pointsUsed: redemption.pointsUsed,
            valueUsed: redemption.pointsValueUsed,
            remainingCash: flightRemaining,
            line,
          });
        }
      }

      if (canUseForHotel && hotelRemaining > 0) {
        // Hotel allocation uses the post-flight balance from the same program.
        const availablePoints = program.remainingPoints;
        const redemption = getBoundedRedemption(availablePoints, program.conversionRate, hotelRemaining);

        if (redemption.pointsUsed > 0) {
          program.remainingPoints = round2(Math.max(0, availablePoints - redemption.pointsUsed));
          hotelRemaining = redemption.remainingCost;
          totalPointsUsed += redemption.pointsUsed;
          totalHotelPointsValueUsed += redemption.pointsValueUsed;
          breakdown.usedForHotel = redemption.pointsUsed;

          if (redemption.remainingCost <= 0) {
            const line = `Convert ${formatPoints(redemption.pointsUsed)} ${program.name} points → Free stay`;
            hotelPlan.push(line);
            usage.hotel.push({
              program: program.name,
              type: program.programType,
              availablePoints: round2(availablePoints),
              conversionRate: program.conversionRate,
              maxPointsUsable: redemption.maxPointsUsable,
              pointsUsed: redemption.pointsUsed,
              valueUsed: redemption.pointsValueUsed,
              remainingCash: hotelRemaining,
              line,
            });
          } else {
            const line = `Convert ${formatPoints(redemption.pointsUsed)} ${program.name} points (${formatCurrency(
              redemption.pointsValueUsed,
            )} value) toward stay`;
            hotelPlan.push(line);
            usage.hotel.push({
              program: program.name,
              type: program.programType,
              availablePoints: round2(availablePoints),
              conversionRate: program.conversionRate,
              maxPointsUsable: redemption.maxPointsUsable,
              pointsUsed: redemption.pointsUsed,
              valueUsed: redemption.pointsValueUsed,
              remainingCash: hotelRemaining,
              line,
            });
          }
        }
      }

      breakdown.remainingPoints = round2(Math.max(0, program.remainingPoints));
      pointsBreakdown.push(breakdown);
    }

    const flightRemainingCost = round2(Math.max(0, pricing.flightPrice - totalFlightPointsValueUsed));
    const hotelRemainingCost = round2(Math.max(0, pricing.hotelPrice - totalHotelPointsValueUsed));

    const bestCard = sortedCards[0] || null;
    let cardBenefits = 0;

    if (flightRemainingCost > 0) {
      if (bestCard) {
        cardBenefits = rewardValue(
          flightRemainingCost,
          bestCard.earnRateSpend,
          bestCard.earnRatePoints,
          bestCard.pointValue,
        );

        flightPlan.push(`Pay remaining ${formatCurrency(flightRemainingCost)} using ${bestCard.name}`);
      } else {
        flightPlan.push(`Pay remaining ${formatCurrency(flightRemainingCost)} via cash`);
      }
    }

    if (hotelRemainingCost > 0) {
      hotelPlan.push(`Pay remaining ${formatCurrency(hotelRemainingCost)} for hotel via cash/card`);
    }

    const remainingCash = round2(flightRemainingCost + hotelRemainingCost);
    const roundedPointsUsed = round2(totalPointsUsed);
    const roundedPointsValueUsed = round2(totalFlightPointsValueUsed + totalHotelPointsValueUsed);
    const roundedCardBenefits = round2(cardBenefits);
    const calculatedCost = round2(flightRemainingCost + hotelRemainingCost - roundedCardBenefits);
    const effectiveCost = round2(Math.max(0, calculatedCost));
    const savings = round2(Math.max(0, totalCost - effectiveCost));
    const tracking = {
      pointsUsed: roundedPointsUsed,
      remainingCash,
      totalSavings: savings,
      pointsValueUsed: roundedPointsValueUsed,
      cardBenefits: roundedCardBenefits,
      flightRemainingCost,
      hotelRemainingCost,
      pointsBreakdown,
    };

    const bestOption = {
      name: 'Primary Strategy',
      effective_cost: effectiveCost,
      usage,
      programTypes,
      tracking,
      pointsBreakdown,
    };

    const options = [bestOption];

    let explanation =
      'Your points and card strategy reduces your trip spend significantly while preserving strong reward value on remaining payments.';

    try {
      const ragPayload = {
        userContext: {
          summary: `Best Strategy for ${trip.from} → ${trip.to}`,
          flightPlan,
          hotelPlan,
          savings,
        },
        options,
        bestOption,
        programTypes,
      };

      req.log.debug({ ragPayload }, '[optimizer] sending plan to RAG');
      const ragResponse = await fetch(`${RAG_SERVICE_URL}/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ragPayload),
      });

      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        if (typeof ragData.explanation === 'string' && ragData.explanation.trim().length > 0) {
          explanation = ragData.explanation.trim();
        }
      } else {
        const errorText = await ragResponse.text();
        req.log.warn({ status: ragResponse.status, body: errorText }, '[optimizer] RAG service returned non-OK status');
      }
    } catch (ragError) {
      req.log.warn({ err: ragError }, '[optimizer] failed to enrich response with RAG explanation');
    }

    const response = {
      summary: `Best Strategy for ${trip.from} → ${trip.to}`,
      flightPlan,
      hotelPlan,
      savings,
      totalSavings: tracking.totalSavings,
      pointsUsed: tracking.pointsUsed,
      remainingCash: tracking.remainingCash,
      pointsBreakdown,
      tracking,
      effective_cost: effectiveCost,
      pricing: {
        routeKey: pricing.routeKey,
        flightPrice: pricing.flightPrice,
        hotelPrice: pricing.hotelPrice,
        variation: pricing.variation,
      },
      options,
      programTypes,
      explanation,
      profileNotes,
      profileSummary: {
        cardCount: cards.length,
        programCount: loyaltyPrograms.length,
      },
    };

    req.log.debug({ response }, '[optimizer] response payload');

    // Persist trip history for authenticated users (best-effort; never block the response).
    if (req.user) {
      prisma.trip
        .create({
          data: {
            userId: req.user.id,
            fromCity: trip.from,
            toCity: trip.to,
            effectiveCost: response.effective_cost ?? 0,
            savings: response.savings ?? 0,
            pointsUsed: response.pointsUsed ?? 0,
            resultJson: response,
          },
        })
        .catch((tripErr) => {
          req.log.error({ err: tripErr }, '[optimizer] failed to persist trip history');
        });
    }

    return res.status(200).json(response);
  } catch (error) {
    req.log.error({ err: error }, '[optimizer] unexpected error');
    return res.status(500).json({
      error: 'Internal server error while generating travel plan',
    });
  }
}
