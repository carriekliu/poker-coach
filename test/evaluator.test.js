import { parseCards } from '../src/engine/cards.js';
import { evaluate, describe as describeHand, CATEGORY, CATEGORY_LABEL } from '../src/engine/evaluator.js';

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    passed += 1;
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}\n        expected ${expected}, got ${actual}`);
  }
}

function cat(hand) {
  return evaluate(parseCards(hand)).category;
}

function desc(hand) {
  return describeHand(evaluate(parseCards(hand)));
}

// --- category detection -----------------------------------------------------

check('royal flush', cat('As Ks Qs Js Ts 2c 7d'), CATEGORY.STRAIGHT_FLUSH);
check('straight flush', cat('9h 8h 7h 6h 5h Ac Kd'), CATEGORY.STRAIGHT_FLUSH);
check('steel wheel (A-5 suited)', cat('Ah 2h 3h 4h 5h Kc Qd'), CATEGORY.STRAIGHT_FLUSH);
check('quads', cat('Js Jh Jd Jc 7d 2c 3s'), CATEGORY.QUADS);
check('full house', cat('Qs Qh Qd 4c 4s 9h 2d'), CATEGORY.FULL_HOUSE);
check('full house from two sets', cat('Qs Qh Qd 4c 4s 4h 2d'), CATEGORY.FULL_HOUSE);
check('flush', cat('Ac Jc 8c 6c 3c Kd Qh'), CATEGORY.FLUSH);
check('straight', cat('Td 9s 8h 7c 6d Ac Kh'), CATEGORY.STRAIGHT);
check('wheel straight', cat('Ad 2s 3h 4c 5d Kc Qh'), CATEGORY.STRAIGHT);
check('trips', cat('8s 8h 8d Kc 2d 5h 7c'), CATEGORY.TRIPS);
check('two pair', cat('As Ac 6h 6d 9s 3c 2d'), CATEGORY.TWO_PAIR);
check('one pair', cat('Th Ts Kd 7c 3s 2d 4h'), CATEGORY.PAIR);
check('high card', cat('Ad Qs 9h 6c 3d 2s 7h'), CATEGORY.HIGH_CARD);

// A board that looks like a straight but is not — the gap matters.
check('no straight with a gap', cat('Td 9s 8h 6c 5d Ac Kh'), CATEGORY.HIGH_CARD);
// Ace does not wrap around: Q-K-A-2-3 is not a straight.
check('ace does not wrap', cat('Qd Ks Ah 2c 3d 7h 9s'), CATEGORY.HIGH_CARD);

// --- ordering ---------------------------------------------------------------

function beats(name, winner, loser) {
  const w = evaluate(parseCards(winner)).score;
  const l = evaluate(parseCards(loser)).score;
  check(name, w > l, true);
}

beats('flush beats straight', 'Ac Jc 8c 6c 3c Kd Qh', 'Td 9s 8h 7c 6d Ac Kh');
beats('full house beats flush', 'Qs Qh Qd 4c 4s 9h 2d', 'Ac Jc 8c 6c 3c Kd Qh');
beats('higher kicker wins', 'Th Ts Kd 7c 3s 2d 4h', 'Td Tc Qd 7s 3h 2c 4s');
beats('higher two pair wins', 'As Ac 2h 2d 9s 3c 4d', 'Ks Kc Qh Qd 9s 3c 4d');
beats('better full house wins', 'Ks Kh Kd 2c 2s 9h 4d', 'Qs Qh Qd Ac As 9h 4d');
beats('ace-high beats king-high', 'Ad Qs 9h 6c 3d 2s 7h', 'Kd Qs 9h 6c 3d 2s 7h');
beats('nine-high straight beats wheel', '9d 8s 7h 6c 5d 2s 3h', 'Ad 2s 3h 4c 5d 9h Jc');
beats('quads beat a full house', 'Js Jh Jd Jc 7d 2c 3s', 'Qs Qh Qd 4c 4s 9h 2d');

// Two players sharing a board — the classic kicker case.
const board = '2h 7d Ks 9c 4s';
beats('AK beats KQ on the same board', `As Kd ${board}`, `Qs Kh ${board}`);

// --- descriptions -----------------------------------------------------------

check('describes quads', desc('Js Jh Jd Jc 7d 2c 3s'), 'four jacks');
check('describes full house', desc('Qs Qh Qd 4c 4s 9h 2d'), 'queens full of fours');
check('describes royal', desc('As Ks Qs Js Ts 2c 7d'), 'royal flush');
check('describes wheel', desc('Ad 2s 3h 4c 5d Kc Qh'), 'five-high straight');
check('describes two pair', desc('As Ac 6h 6d 9s 3c 2d'), 'aces and sixes');
check('describes a pair', desc('Th Ts Kd 7c 3s 2d 4h'), 'a pair of tens');
check('describes high card', desc('Ad Qs 9h 6c 3d 2s 7h'), 'ace high');

// --- five-card hands should work too ---------------------------------------

check('five cards: flush', cat('Ac Jc 8c 6c 3c'), CATEGORY.FLUSH);
check('five cards: straight', cat('Td 9s 8h 7c 6d'), CATEGORY.STRAIGHT);

// --- exhaustive sanity: category frequencies over all 5-card hands ----------
// Known counts out of C(52,5) = 2,598,960.
const EXPECTED_FREQ = {
  [CATEGORY.HIGH_CARD]: 1302540,
  [CATEGORY.PAIR]: 1098240,
  [CATEGORY.TWO_PAIR]: 123552,
  [CATEGORY.TRIPS]: 54912,
  [CATEGORY.STRAIGHT]: 10200,
  [CATEGORY.FLUSH]: 5108,
  [CATEGORY.FULL_HOUSE]: 3744,
  [CATEGORY.QUADS]: 624,
  [CATEGORY.STRAIGHT_FLUSH]: 40,
};

const freq = new Array(9).fill(0);
const hand = new Array(5);
for (let a = 0; a < 52; a += 1) {
  hand[0] = a;
  for (let b = a + 1; b < 52; b += 1) {
    hand[1] = b;
    for (let c = b + 1; c < 52; c += 1) {
      hand[2] = c;
      for (let d = c + 1; d < 52; d += 1) {
        hand[3] = d;
        for (let e = d + 1; e < 52; e += 1) {
          hand[4] = e;
          freq[evaluate(hand).category] += 1;
        }
      }
    }
  }
}

for (const [category, expected] of Object.entries(EXPECTED_FREQ)) {
  check(`frequency of ${CATEGORY_LABEL[category]}`, freq[category], expected);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
