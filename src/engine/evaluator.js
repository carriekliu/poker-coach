// Seven-card hand evaluator.
//
// Evaluates directly by rank/suit counting rather than enumerating all 21
// five-card subsets. Returns a single integer score where a larger number is
// always a better hand, so comparison is just `a > b`.
//
// Score layout, base 16:
//   category * 16^5 + tiebreak1 * 16^4 + ... + tiebreak5
// Five tiebreak slots is enough for the worst case (high card / flush, which
// need all five kickers). Unused slots are zero.

import { rankOf, suitOf, RANK_LABEL, RANK_LABEL_PLURAL } from './cards.js';

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
};

export const CATEGORY_LABEL = [
  'high card',
  'one pair',
  'two pair',
  'three of a kind',
  'straight',
  'flush',
  'full house',
  'four of a kind',
  'straight flush',
];

const BASE = 16;
const P5 = BASE ** 5;
const P4 = BASE ** 4;
const P3 = BASE ** 3;
const P2 = BASE ** 2;

const score = (category, a = 0, b = 0, c = 0, d = 0, e = 0) =>
  category * P5 + a * P4 + b * P3 + c * P2 + d * BASE + e;

/**
 * Given a 13-bit mask of present ranks, return the high rank of the best
 * straight, or -1. Bit i is set when rank i is present.
 * The wheel (5-4-3-2-A) is handled by treating the ace as a low card.
 */
function straightHigh(rankMask) {
  // Walk down from ace so the first hit is the best straight. `high` is the
  // rank of the top card, so the run covers bits high..high-4.
  for (let high = 12; high >= 4; high -= 1) {
    const run = 0b11111 << (high - 4);
    if ((rankMask & run) === run) return high;
  }
  // The wheel is the one non-contiguous straight: A-5-4-3-2, where the ace
  // plays low. Ace is bit 12, the rest are bits 0-3.
  const wheel = 0b1111 | (1 << 12);
  if ((rankMask & wheel) === wheel) return 3; // five-high straight
  return -1;
}

/**
 * Evaluate 5-7 cards. Returns { score, category, ranks } where `ranks` holds
 * the tiebreak ranks in significance order — useful for building descriptions.
 */
export function evaluate(cards) {
  const rankCounts = new Uint8Array(13);
  const suitCounts = new Uint8Array(4);
  const suitRankMask = new Uint16Array(4);
  let rankMask = 0;

  for (const card of cards) {
    const r = rankOf(card);
    const s = suitOf(card);
    rankCounts[r] += 1;
    suitCounts[s] += 1;
    suitRankMask[s] |= 1 << r;
    rankMask |= 1 << r;
  }

  // Flush and straight flush.
  let flushSuit = -1;
  for (let s = 0; s < 4; s += 1) if (suitCounts[s] >= 5) flushSuit = s;

  if (flushSuit !== -1) {
    const sfHigh = straightHigh(suitRankMask[flushSuit]);
    if (sfHigh !== -1) {
      return {
        score: score(CATEGORY.STRAIGHT_FLUSH, sfHigh),
        category: CATEGORY.STRAIGHT_FLUSH,
        ranks: [sfHigh],
      };
    }
  }

  // Group ranks by multiplicity, each group ordered high to low.
  const quads = [];
  const trips = [];
  const pairs = [];
  const singles = [];
  for (let r = 12; r >= 0; r -= 1) {
    const n = rankCounts[r];
    if (n === 4) quads.push(r);
    else if (n === 3) trips.push(r);
    else if (n === 2) pairs.push(r);
    else if (n === 1) singles.push(r);
  }

  if (quads.length) {
    const kicker = Math.max(
      ...[...trips, ...pairs, ...singles].filter((r) => r !== quads[0]),
      -1,
    );
    return {
      score: score(CATEGORY.QUADS, quads[0], kicker),
      category: CATEGORY.QUADS,
      ranks: [quads[0], kicker],
    };
  }

  if (trips.length >= 2) {
    // Two sets: the lower one plays as the pair.
    return {
      score: score(CATEGORY.FULL_HOUSE, trips[0], trips[1]),
      category: CATEGORY.FULL_HOUSE,
      ranks: [trips[0], trips[1]],
    };
  }

  if (trips.length === 1 && pairs.length >= 1) {
    return {
      score: score(CATEGORY.FULL_HOUSE, trips[0], pairs[0]),
      category: CATEGORY.FULL_HOUSE,
      ranks: [trips[0], pairs[0]],
    };
  }

  if (flushSuit !== -1) {
    const flushRanks = [];
    for (let r = 12; r >= 0 && flushRanks.length < 5; r -= 1) {
      if ((suitRankMask[flushSuit] >> r) & 1) flushRanks.push(r);
    }
    return {
      score: score(CATEGORY.FLUSH, ...flushRanks),
      category: CATEGORY.FLUSH,
      ranks: flushRanks,
    };
  }

  const stHigh = straightHigh(rankMask);
  if (stHigh !== -1) {
    return {
      score: score(CATEGORY.STRAIGHT, stHigh),
      category: CATEGORY.STRAIGHT,
      ranks: [stHigh],
    };
  }

  if (trips.length === 1) {
    const kickers = singles.slice(0, 2);
    return {
      score: score(CATEGORY.TRIPS, trips[0], ...kickers),
      category: CATEGORY.TRIPS,
      ranks: [trips[0], ...kickers],
    };
  }

  if (pairs.length >= 2) {
    const kicker = Math.max(...singles, ...pairs.slice(2), -1);
    return {
      score: score(CATEGORY.TWO_PAIR, pairs[0], pairs[1], kicker),
      category: CATEGORY.TWO_PAIR,
      ranks: [pairs[0], pairs[1], kicker],
    };
  }

  if (pairs.length === 1) {
    const kickers = singles.slice(0, 3);
    return {
      score: score(CATEGORY.PAIR, pairs[0], ...kickers),
      category: CATEGORY.PAIR,
      ranks: [pairs[0], ...kickers],
    };
  }

  const top5 = singles.slice(0, 5);
  return {
    score: score(CATEGORY.HIGH_CARD, ...top5),
    category: CATEGORY.HIGH_CARD,
    ranks: top5,
  };
}

/** Just the comparable number, for hot loops. */
export const evaluateScore = (cards) => evaluate(cards).score;

/**
 * Plain-English name for a hand, e.g. "queens full of fours".
 * Written the way a person would say it at the table, not as a category name.
 */
export function describe(result) {
  const { category, ranks } = result;
  const R = (i) => RANK_LABEL[ranks[i]];
  const P = (i) => RANK_LABEL_PLURAL[ranks[i]];

  switch (category) {
    case CATEGORY.STRAIGHT_FLUSH:
      return ranks[0] === 12 ? 'royal flush' : `${R(0)}-high straight flush`;
    case CATEGORY.QUADS:
      return `four ${P(0)}`;
    case CATEGORY.FULL_HOUSE:
      return `${P(0)} full of ${P(1)}`;
    case CATEGORY.FLUSH:
      return `${R(0)}-high flush`;
    case CATEGORY.STRAIGHT:
      return `${R(0)}-high straight`;
    case CATEGORY.TRIPS:
      return `three ${P(0)}`;
    case CATEGORY.TWO_PAIR:
      return `${P(0)} and ${P(1)}`;
    case CATEGORY.PAIR:
      return `a pair of ${P(0)}`;
    default:
      return `${R(0)} high`;
  }
}
