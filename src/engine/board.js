// Reading the board.
//
// This module answers "what could someone else have?" — which is the question
// a beginner never thinks to ask, and the one that separates folding a good
// hand from paying off a better one.

import { rankOf, suitOf, remainingDeck, cardToGlyph } from './cards.js';
import { evaluate, CATEGORY } from './evaluator.js';

/**
 * The best five-card hand available to anyone holding two unseen cards.
 * Enumerates every remaining two-card combination — about a thousand at most,
 * so exhaustive rather than sampled.
 *
 * @param exclude cards known to be unavailable (hero's hole cards). Passing
 *        them gives the nuts *someone else* can hold; omitting them gives the
 *        nuts in the abstract.
 */
export function nuts(board, exclude = []) {
  if (board.length < 3) throw new Error('Need at least a flop to read the board');

  const available = remainingDeck([...board, ...exclude]);
  let best = null;

  for (let i = 0; i < available.length; i += 1) {
    for (let j = i + 1; j < available.length; j += 1) {
      const hole = [available[i], available[j]];
      const result = evaluate([...hole, ...board]);
      if (!best || result.score > best.result.score) best = { hole, result };
    }
  }

  return best;
}

/**
 * Which hand categories are reachable on this board, and which are ruled out.
 *
 * Drives the greying-out on the rankings sheet. The value for a beginner is
 * mostly negative information: knowing a flush is impossible is what stops
 * them folding two pair to a scary-looking bet.
 */
export function possibleCategories(board) {
  const suitCounts = new Uint8Array(4);
  const rankCounts = new Uint8Array(13);
  for (const card of board) {
    suitCounts[suitOf(card)] += 1;
    rankCounts[rankOf(card)] += 1;
  }

  const maxSuit = Math.max(...suitCounts);
  const boardPaired = Array.from(rankCounts).some((n) => n >= 2);
  const boardTrips = Array.from(rankCounts).some((n) => n >= 3);

  // A flush needs three of one suit on the board, since a player holds two cards.
  const flushPossible = maxSuit >= 3;
  const straightFlushPossible = flushPossible && hasStraightPotential(board, true);
  const straightPossible = hasStraightPotential(board, false);

  const reachable = {
    [CATEGORY.HIGH_CARD]: true,
    [CATEGORY.PAIR]: true,
    [CATEGORY.TWO_PAIR]: true,
    [CATEGORY.TRIPS]: true,
    [CATEGORY.STRAIGHT]: straightPossible,
    [CATEGORY.FLUSH]: flushPossible,
    // A full house or quads need help from a paired board, unless a player
    // holds a pocket pair that hits — which is always conceivable.
    [CATEGORY.FULL_HOUSE]: true,
    [CATEGORY.QUADS]: true,
    [CATEGORY.STRAIGHT_FLUSH]: straightFlushPossible,
  };

  return {
    reachable,
    flushPossible,
    flushDrawPossible: maxSuit >= 2,
    straightPossible,
    boardPaired,
    boardTrips,
    suitCounts: Array.from(suitCounts),
    // Plain-English notes the coach can hand straight to the language layer.
    notes: buildNotes({ flushPossible, maxSuit, straightPossible, boardPaired, boardTrips }),
  };
}

/**
 * Could any two hole cards complete a straight with this board?
 * Checks every five-rank window for at least three board ranks present, since
 * a player supplies at most two of the five.
 */
function hasStraightPotential(board, sameSuitOnly) {
  let cards = board;
  if (sameSuitOnly) {
    const bySuit = [[], [], [], []];
    for (const card of board) bySuit[suitOf(card)].push(card);
    const flushSuit = bySuit.findIndex((group) => group.length >= 3);
    if (flushSuit === -1) return false;
    cards = bySuit[flushSuit];
  }

  const present = new Set(cards.map(rankOf));
  // Ace plays low for the wheel: treat it as rank -1 as well.
  if (present.has(12)) present.add(-1);

  for (let low = -1; low <= 8; low += 1) {
    let count = 0;
    for (let r = low; r < low + 5; r += 1) if (present.has(r)) count += 1;
    if (count >= 3) return true;
  }
  return false;
}

function buildNotes({ flushPossible, maxSuit, straightPossible, boardPaired, boardTrips }) {
  const notes = [];
  if (flushPossible) notes.push('three of one suit are out — a flush is possible');
  else if (maxSuit === 2) notes.push('two of one suit — no flush yet, but one card away');
  else notes.push('no flush possible');

  if (straightPossible) notes.push('the ranks are close enough for a straight');
  if (boardTrips) notes.push('three of a kind on the board — full houses and quads are live');
  else if (boardPaired) notes.push('the board is paired — someone may have a full house');
  return notes;
}

/** Human-readable board string for prompts and display, e.g. 'K♥ 9♠ 4♣'. */
export const boardToGlyphs = (board) => board.map(cardToGlyph).join(' ');

/** Which street the board represents. Derived, never stored. */
export function street(board) {
  switch (board.length) {
    case 0: return 'preflop';
    case 3: return 'flop';
    case 4: return 'turn';
    case 5: return 'river';
    default: throw new Error(`A board cannot hold ${board.length} cards`);
  }
}
