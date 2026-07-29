// Card representation.
//
// A card is a single integer 0-51, encoded as rank * 4 + suit.
//   rank: 0 = deuce ... 12 = ace
//   suit: 0 = clubs, 1 = diamonds, 2 = hearts, 3 = spades
//
// Integers keep the Monte Carlo loop fast (no object allocation per deal)
// while the helpers below keep the rest of the codebase readable.

export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';

// Index is the internal rank value (0 = deuce, 12 = ace).
export const RANK_LABEL = [
  'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'jack', 'queen', 'king', 'ace',
];

export const RANK_LABEL_PLURAL = [
  'twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights',
  'nines', 'tens', 'jacks', 'queens', 'kings', 'aces',
];

export const SUIT_LABEL = ['clubs', 'diamonds', 'hearts', 'spades'];
export const SUIT_GLYPH = ['\u2663', '\u2666', '\u2665', '\u2660'];

export const rankOf = (card) => card >> 2;
export const suitOf = (card) => card & 3;

export const isRedSuit = (suit) => suit === 1 || suit === 2;

/**
 * Parse a card string like 'As', 'Th', '9c' into its integer form.
 * Rank is case-insensitive; suit accepts letters or unicode glyphs.
 */
export function parseCard(str) {
  if (typeof str !== 'string') throw new TypeError(`Expected a card string, got ${typeof str}`);
  const trimmed = str.trim();
  if (trimmed.length !== 2) throw new Error(`Malformed card: "${str}"`);

  const rank = RANKS.indexOf(trimmed[0].toUpperCase());
  if (rank === -1) throw new Error(`Unknown rank in card: "${str}"`);

  let suit = SUITS.indexOf(trimmed[1].toLowerCase());
  if (suit === -1) suit = SUIT_GLYPH.indexOf(trimmed[1]);
  if (suit === -1) throw new Error(`Unknown suit in card: "${str}"`);

  return rank * 4 + suit;
}

/** Parse a whitespace-separated hand string: 'As Kd 9c' -> [51, 46, 30]. */
export function parseCards(str) {
  if (Array.isArray(str)) return str.map((c) => (typeof c === 'number' ? c : parseCard(c)));
  if (!str || !str.trim()) return [];
  return str.trim().split(/\s+/).map(parseCard);
}

/** Render a card as 'As' style shorthand. */
export function cardToString(card) {
  return RANKS[rankOf(card)] + SUITS[suitOf(card)];
}

/** Render a card as 'A♠' for display in the UI. */
export function cardToGlyph(card) {
  return RANKS[rankOf(card)] + SUIT_GLYPH[suitOf(card)];
}

export const cardsToString = (cards) => cards.map(cardToString).join(' ');

/** A full 52-card deck. */
export function fullDeck() {
  return Array.from({ length: 52 }, (_, i) => i);
}

/**
 * Every card not in `used`. Used as the sample space for equity simulation
 * and for enumerating candidate outs.
 */
export function remainingDeck(used) {
  const seen = new Uint8Array(52);
  for (const c of used) seen[c] = 1;
  const out = [];
  for (let i = 0; i < 52; i += 1) if (!seen[i]) out.push(i);
  return out;
}

/**
 * Throw if the same card appears twice. Worth calling on any user-supplied
 * input, since a duplicated card silently corrupts every downstream number
 * and — with camera input in particular — is a realistic failure mode.
 */
export function assertNoDuplicates(cards) {
  const seen = new Set();
  for (const c of cards) {
    if (seen.has(c)) throw new Error(`Duplicate card: ${cardToString(c)}`);
    seen.add(c);
  }
}
