import { parseCards, cardsToString } from '../src/engine/cards.js';
import { equity, outs, potOdds } from '../src/engine/equity.js';
import { nuts, possibleCategories, street } from '../src/engine/board.js';
import { CATEGORY } from '../src/engine/evaluator.js';

let passed = 0;
let failed = 0;

function near(name, actual, expected, tolerance) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) passed += 1;
  else {
    failed += 1;
    console.log(`  FAIL  ${name}\n        expected ~${expected} (±${tolerance}), got ${actual.toFixed(4)}`);
  }
}

function check(name, actual, expected) {
  if (actual === expected) passed += 1;
  else {
    failed += 1;
    console.log(`  FAIL  ${name}\n        expected ${expected}, got ${actual}`);
  }
}

// Deterministic RNG so the suite doesn't flake. mulberry32.
function seeded(seed) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const opts = (iterations = 20000) => ({ iterations, rng: seeded(12345) });

// --- equity against known published values ----------------------------------
// These are standard heads-up preflop matchups every poker source agrees on.

near(
  'AA vs one random hand ~85%',
  equity(parseCards('As Ah'), [], 1, opts()).equity,
  0.852, 0.015,
);

near(
  'AKs vs one random hand ~67%',
  equity(parseCards('As Ks'), [], 1, opts()).equity,
  0.67, 0.02,
);

near(
  '72o vs one random hand ~35%',
  equity(parseCards('7d 2c'), [], 1, opts()).equity,
  0.354, 0.02,
);

near(
  'AA vs four random hands ~56%',
  equity(parseCards('As Ah'), [], 4, opts()).equity,
  0.559, 0.025,
);

// Made hand on the river is deterministic — no cards to come.
near(
  'the nuts on the river wins every time',
  equity(parseCards('Js Ts'), parseCards('As Ks Qs 2h 3d'), 1, opts(4000)).equity,
  1.0, 0.001,
);

// A flush draw on the flop against one opponent: roughly a coin flip.
// A nut flush draw against a random hand, not against a made hand — the
// draw plus ace-high is worth far more than the coin flip people quote.
near(
  'nut flush draw plus ace high on the flop ~67%',
  equity(parseCards('Ah 5h'), parseCards('Kh 9h 2c'), 1, opts()).equity,
  0.672, 0.02,
);
near(
  'the same hand without the draw is much weaker',
  equity(parseCards('Ad 5c'), parseCards('Kh 9h 2c'), 1, opts()).equity,
  0.458, 0.02,
);

// More opponents can only reduce equity.
const heads = equity(parseCards('Kd Qc'), parseCards('Ks 7d 2h'), 1, opts(8000)).equity;
const fourWay = equity(parseCards('Kd Qc'), parseCards('Ks 7d 2h'), 4, opts(8000)).equity;
check('equity falls as opponents are added', heads > fourWay, true);

// --- outs -------------------------------------------------------------------
// A♠J♣ on K♥9♠4♣Q♥ — only a ten makes a straight, and there are four of them.

const o = outs(parseCards('As Jc'), parseCards('Kh 9s 4c Qh'), 1);
check('unseen card count is right on the turn', o.unseenCount, 46);

// The four tens make a straight and must all be clean outs.
const tens = parseCards('Td Th Tc Ts');
const cleanSet = new Set(o.clean);
check('every ten is a clean out', tens.every((t) => cleanSet.has(t)), true);
// Seven clean: four tens make a straight, three aces make top pair. Top pair
// really is a favourite against one random hand — it stops being one as
// players are added, which the next assertion checks.
check('seven clean outs against a single opponent', o.cleanCount, 7);
check('all four tens plus three aces', cleanSet.size, 7);

const vsFour = outs(parseCards('As Jc'), parseCards('Kh 9s 4c Qh'), 4);
check('outs shrink as opponents are added', vsFour.cleanCount <= o.cleanCount, true);

// Repeated calls on the same spot must agree exactly.
const o2 = outs(parseCards('As Jc'), parseCards('Kh 9s 4c Qh'), 1);
check('outs are deterministic', o2.cleanCount === o.cleanCount && o2.marginalCount === o.marginalCount, true);

// --- board reading ----------------------------------------------------------

const dry = possibleCategories(parseCards('Kh 9s 4c'));
check('no flush on a rainbow flop', dry.flushPossible, false);
check('rainbow flop rules out a flush', dry.reachable[CATEGORY.FLUSH], false);
check('rainbow flop rules out a straight flush', dry.reachable[CATEGORY.STRAIGHT_FLUSH], false);
check('board is not paired', dry.boardPaired, false);

const wet = possibleCategories(parseCards('Kh 9h 4h'));
check('three hearts allow a flush', wet.flushPossible, true);

const paired = possibleCategories(parseCards('Kh Kd 4c'));
check('paired board is flagged', paired.boardPaired, true);

// K-9-4 rainbow: no three ranks sit inside any five-card window, so no straight.
check('disconnected flop rules out a straight', dry.straightPossible, false);
const connected = possibleCategories(parseCards('9h 8s 7c'));
check('connected flop allows a straight', connected.straightPossible, true);

// --- the nuts ---------------------------------------------------------------

const n1 = nuts(parseCards('Kh 9s 4c Qh'));
check('best hand on K♥9♠4♣Q♥ is a straight flush draw board', n1.result.category >= CATEGORY.TRIPS, true);

const n2 = nuts(parseCards('As Ks Qs'));
check('royal flush is the nuts on three spades to the ace', n2.result.category, CATEGORY.STRAIGHT_FLUSH);
check('royal is made with JsTs', cardsToString(n2.hole.slice().sort((a, b) => b - a)), 'Js Ts');

// Excluding hero's cards changes what an opponent can hold.
const n3 = nuts(parseCards('As Ks Qs'), parseCards('Js Ts'));
check('opponent cannot have the royal once hero holds it', n3.result.category < CATEGORY.STRAIGHT_FLUSH, true);

// --- pot odds ---------------------------------------------------------------

near('calling 80 into 240 needs 25%', potOdds(240, 80), 0.25, 0.0001);
near('calling 50 into a pot of 100 needs 33%', potOdds(100, 50), 1 / 3, 0.0001);
check('nothing to call costs nothing', potOdds(100, 0), 0);

// --- street inference -------------------------------------------------------

check('no cards is preflop', street([]), 'preflop');
check('three cards is the flop', street(parseCards('Kh 9s 4c')), 'flop');
check('four cards is the turn', street(parseCards('Kh 9s 4c Qh')), 'turn');
check('five cards is the river', street(parseCards('Kh 9s 4c Qh 2d')), 'river');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
