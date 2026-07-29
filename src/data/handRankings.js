// Reference data for the rankings sheet.
//
// Each entry carries a worked five-card example, split into the cards that
// actually form the hand and the kickers that don't. Showing the split is the
// point: "my pair of tens with an ace beats your pair of tens with a seven" is
// a rule people lose real chips to before anyone explains it to them.

import { CATEGORY } from '../engine/evaluator.js';

export const HAND_RANKINGS = [
  {
    category: CATEGORY.STRAIGHT_FLUSH,
    name: 'Straight flush',
    blurb: 'Five in a row, all the same suit. Ace-high has its own name: a royal flush.',
    making: ['As', 'Ks', 'Qs', 'Js', 'Ts'],
    kickers: [],
  },
  {
    category: CATEGORY.QUADS,
    name: 'Four of a kind',
    blurb: 'All four cards of one rank.',
    making: ['Js', 'Jh', 'Jd', 'Jc'],
    kickers: ['7d'],
  },
  {
    category: CATEGORY.FULL_HOUSE,
    name: 'Full house',
    blurb: 'Three of one rank and two of another. Said as "queens full of fours".',
    making: ['Qs', 'Qh', 'Qd', '4c', '4s'],
    kickers: [],
  },
  {
    category: CATEGORY.FLUSH,
    name: 'Flush',
    blurb: 'Any five of the same suit. Needs three of that suit on the board.',
    making: ['Ac', 'Jc', '8c', '6c', '3c'],
    kickers: [],
  },
  {
    category: CATEGORY.STRAIGHT,
    name: 'Straight',
    blurb: 'Five in a row, suits mixed. Ace plays high or low, but never wraps.',
    making: ['Td', '9s', '8h', '7c', '6d'],
    kickers: [],
  },
  {
    category: CATEGORY.TRIPS,
    name: 'Three of a kind',
    blurb: 'Three cards of the same rank.',
    making: ['8s', '8h', '8d'],
    kickers: ['Kc', '2d'],
  },
  {
    category: CATEGORY.TWO_PAIR,
    name: 'Two pair',
    blurb: 'Two pairs. The higher pair is compared first.',
    making: ['As', 'Ac', '6h', '6d'],
    kickers: ['9s'],
  },
  {
    category: CATEGORY.PAIR,
    name: 'One pair',
    blurb: 'Two cards of the same rank. The highest spare card breaks ties.',
    making: ['Th', 'Ts'],
    kickers: ['Kd', '7c', '3s'],
  },
  {
    category: CATEGORY.HIGH_CARD,
    name: 'High card',
    blurb: 'Nothing made. The highest card plays.',
    making: ['Ad'],
    kickers: ['Qs', '9h', '6c', '3d'],
  },
];

/**
 * Why a category is impossible on a given board, phrased for a beginner.
 * Returns null when the category is reachable.
 *
 * Negative information is most of the value here — knowing nobody can have a
 * flush is what stops someone folding two pair to a big bet.
 */
export function impossibleReason(category, texture) {
  if (category === CATEGORY.FLUSH && !texture.flushPossible) {
    return texture.flushDrawPossible
      ? 'needs one more of a suit'
      : 'no three cards share a suit';
  }
  if (category === CATEGORY.STRAIGHT_FLUSH && !texture.reachable[CATEGORY.STRAIGHT_FLUSH]) {
    return 'not possible on this board';
  }
  if (category === CATEGORY.STRAIGHT && !texture.straightPossible) {
    return 'the ranks are too far apart';
  }
  return null;
}
