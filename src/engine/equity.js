// Equity simulation.
//
// Every number the coach states as fact comes from here. The language layer
// gets these values as input and is never asked to compute them, because a
// confidently-worded wrong probability is worse for a beginner than no
// probability at all.

import { remainingDeck, assertNoDuplicates } from './cards.js';
import { evaluate, evaluateScore } from './evaluator.js';

/**
 * Fisher-Yates over the first `n` positions only. Partial shuffling is enough
 * because we never need the tail of the deck, and it keeps the inner loop
 * proportional to the number of cards actually dealt.
 */
function partialShuffle(deck, n, rng) {
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(rng() * (deck.length - i));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
}

/**
 * Hero's share of the pot against `opponents` unknown hands.
 *
 * Opponents are modelled as holding random cards. That understates the danger
 * when someone has been betting hard — a player raising the river does not
 * hold a random hand — which is exactly the gap the language layer is there to
 * fill. Treat this as the floor of what hero needs, not the whole picture.
 *
 * @returns {{equity:number, win:number, tie:number, lose:number, iterations:number}}
 *          equity is 0-1 and counts split pots as a fractional win.
 */
export function equity(hole, board = [], opponents = 1, options = {}) {
  const { iterations = 4000, rng = Math.random } = options;

  assertNoDuplicates([...hole, ...board]);
  if (hole.length !== 2) throw new Error('Hero needs exactly two hole cards');
  if (board.length > 5) throw new Error('A board holds at most five cards');
  if (opponents < 1) throw new Error('Need at least one opponent');

  const deck = remainingDeck([...hole, ...board]);
  const boardToCome = 5 - board.length;
  const cardsNeeded = boardToCome + opponents * 2;

  if (cardsNeeded > deck.length) throw new Error('Not enough cards left in the deck');

  let wins = 0;
  let ties = 0;
  let equitySum = 0;

  const fullBoard = new Array(5);
  for (let i = 0; i < board.length; i += 1) fullBoard[i] = board[i];
  const heroCards = new Array(7);
  const oppCards = new Array(7);

  for (let iter = 0; iter < iterations; iter += 1) {
    partialShuffle(deck, cardsNeeded, rng);

    let d = 0;
    for (let i = 0; i < boardToCome; i += 1) fullBoard[board.length + i] = deck[d++];

    heroCards[0] = hole[0];
    heroCards[1] = hole[1];
    for (let i = 0; i < 5; i += 1) heroCards[2 + i] = fullBoard[i];
    const heroScore = evaluateScore(heroCards);

    let best = heroScore;
    let tiedWith = 0;
    let beaten = false;

    for (let o = 0; o < opponents; o += 1) {
      oppCards[0] = deck[d++];
      oppCards[1] = deck[d++];
      for (let i = 0; i < 5; i += 1) oppCards[2 + i] = fullBoard[i];
      const s = evaluateScore(oppCards);

      if (s > best) {
        best = s;
        beaten = true;
        break;
      }
      if (s === heroScore) tiedWith += 1;
    }

    if (beaten) continue;
    if (tiedWith > 0) {
      ties += 1;
      equitySum += 1 / (tiedWith + 1);
    } else {
      wins += 1;
      equitySum += 1;
    }
  }

  return {
    equity: equitySum / iterations,
    win: wins / iterations,
    tie: ties / iterations,
    lose: (iterations - wins - ties) / iterations,
    iterations,
  };
}

/**
 * A small deterministic PRNG (mulberry32), seeded from the cards in play.
 *
 * Simulation results must not change between renders of the same spot. If the
 * app says four outs and then eleven a second later for the identical board,
 * the beginner stops trusting it — and they have no way to tell which number
 * was the wrong one. Same input, same answer, every time.
 */
export function seededRng(cards) {
  let seed = 2166136261;
  for (const c of cards) {
    seed ^= c + 1;
    seed = Math.imul(seed, 16777619);
  }
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which unseen cards would change hero's situation on the next card.
 *
 * Cards fall into three bands rather than a yes/no split, for two reasons.
 * A single cutoff puts borderline cards on a knife edge where sampling noise
 * decides the count. And it is also just better coaching: "four cards win it
 * outright, another nine give you something that might hold up" is how a
 * person actually explains a hand, and it keeps a beginner from treating a
 * weak pair as though it were a completed straight.
 *
 *   clean    — hero would be a clear favourite
 *   marginal — hero improves to something playable but far from safe
 *   improving — every card that raises the hand category at all (exact, no sampling)
 */
export function outs(hole, board, opponents = 1, options = {}) {
  const {
    iterations = 800,
    cleanThreshold = 0.6,
    marginalThreshold = 0.45,
  } = options;

  if (board.length < 3 || board.length > 4) {
    throw new Error('Outs only make sense on the flop or turn');
  }

  const seen = [...hole, ...board];
  assertNoDuplicates(seen);
  const unseen = remainingDeck(seen);

  const currentCategory = evaluate([...hole, ...board]).category;

  const clean = [];
  const marginal = [];
  const improving = [];

  for (const card of unseen) {
    const nextBoard = [...board, card];
    const category = evaluate([...hole, ...nextBoard]).category;
    if (category > currentCategory) improving.push(card);

    const rng = seededRng([...hole, ...nextBoard, opponents]);
    const { equity: e } = equity(hole, nextBoard, opponents, { iterations, rng });

    if (e >= cleanThreshold) clean.push(card);
    else if (e >= marginalThreshold) marginal.push(card);
  }

  return {
    clean,
    marginal,
    improving,
    cleanCount: clean.length,
    marginalCount: marginal.length,
    improvingCount: improving.length,
    unseenCount: unseen.length,
  };
}

/**
 * Pot odds as the share of the final pot hero must put in.
 * Compare directly against equity: call when equity exceeds this number.
 *
 * `currentPot` is the pot as it stands right now, which means it ALREADY
 * INCLUDES the bet hero is facing. Facing a 50 bet into a pot that was 50
 * before, pass 100 — not 50. Getting this backwards silently produces odds
 * that look plausible and are wrong, so it is worth being fussy about.
 */
export function potOdds(currentPot, amountToCall) {
  if (amountToCall <= 0) return 0;
  return amountToCall / (currentPot + amountToCall);
}

/**
 * How much bigger a bet is than the pot it was made into. This, not the raw
 * chip amount, is what carries information about strength — twenty into thirty
 * and twenty into three hundred are different messages entirely.
 */
export function betAsPotFraction(potSizeBeforeBet, betSize) {
  if (potSizeBeforeBet <= 0) return 0;
  return betSize / potSizeBeforeBet;
}
