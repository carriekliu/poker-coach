import { useState } from 'react';
import { RANKS, SUIT_GLYPH, rankOf, suitOf, isRedSuit } from '../engine/cards.js';
import './CardPicker.css';

// Suit display order: spades, hearts, diamonds, clubs (suit integers 3,2,1,0)
const DISPLAY_SUITS = [3, 2, 1, 0];

function rankDisplay(rankIdx) {
  return RANKS[rankIdx] === 'T' ? '10' : RANKS[rankIdx];
}

/**
 * 52-card grid picker.
 *
 * blocked  — Set<card int> already used elsewhere (greyed, untappable)
 * initial  — card int[] pre-selected (e.g. cards already in hand for edit)
 * maxCards — exact count required to confirm
 * label    — sheet title, e.g. "Pick hole cards", "Enter flop"
 * onConfirm(cards: int[]) — called with final selection
 * onClose() — called on dismiss without confirming
 *
 * Camera integration point: call onConfirm with the detected card integers
 * using the same signature — no other wiring needed.
 */
export function CardPicker({ blocked = new Set(), initial = [], maxCards, label, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(initial));

  function toggle(card) {
    if (blocked.has(card)) return;
    const next = new Set(selected);
    if (next.has(card)) {
      next.delete(card);
    } else if (next.size < maxCards) {
      next.add(card);
    }
    setSelected(next);
  }

  const ready = selected.size === maxCards;

  return (
    <div className="cpicker-overlay" onClick={onClose}>
      <div className="cpicker" onClick={(e) => e.stopPropagation()}>
        <div className="cpicker__header">
          <span className="cpicker__title">{label}</span>
          <span className="cpicker__count">{selected.size}/{maxCards}</span>
          <button className="cpicker__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cpicker__grid">
          {DISPLAY_SUITS.map((suit) => (
            <div key={suit} className="cpicker__row">
              {Array.from({ length: 13 }, (_, rankIdx) => {
                const card = rankIdx * 4 + suit;
                const isBlocked = blocked.has(card);
                const isSel = selected.has(card);
                const red = isRedSuit(suit);
                return (
                  <button
                    key={card}
                    className={[
                      'cpicker__cell',
                      red ? 'cpicker__cell--red' : 'cpicker__cell--black',
                      isSel ? 'cpicker__cell--sel' : '',
                      isBlocked ? 'cpicker__cell--blocked' : '',
                    ].join(' ')}
                    onClick={() => toggle(card)}
                    aria-label={`${RANKS[rankIdx]}${SUIT_GLYPH[suit]}`}
                    aria-pressed={isSel}
                  >
                    <span className="cpicker__rank">{rankDisplay(rankIdx)}</span>
                    <span className="cpicker__suit">{SUIT_GLYPH[suit]}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cpicker__footer">
          <button
            className="cpicker__confirm"
            disabled={!ready}
            onClick={() => onConfirm([...selected])}
          >
            {ready ? `Confirm ${selected.size} card${selected.size !== 1 ? 's' : ''}` : `Select ${maxCards} card${maxCards !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
