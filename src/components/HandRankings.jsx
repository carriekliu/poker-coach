import { useState } from 'react';
import { HAND_RANKINGS, impossibleReason } from '../data/handRankings.js';
import { possibleCategories } from '../engine/board.js';
import './HandRankings.css';

const SUIT_GLYPH = { c: '♣', d: '♦', h: '♥', s: '♠' };
const RED_SUITS = new Set(['d', 'h']);

const POPOVER_CONTENT = {
  making: {
    title: 'Makes the hand',
    body: 'These are the cards that actually form your hand — the pair, the flush, the straight. They decide your hand rank; any remaining cards are ignored entirely.',
  },
  kicker: {
    title: 'Kicker',
    body: "A spare card that doesn't form the hand, but breaks ties. If two players both have a pair of tens, the one with the higher kicker wins. Tens with an ace beats tens with a seven — that extra card can be the difference between winning and losing the pot.",
  },
};

function PlayingCard({ card, dimmed }) {
  const rank = card[0];
  const suit = card[1];
  const red = RED_SUITS.has(suit);
  const display = rank === 'T' ? '10' : rank;
  return (
    <div className={`pc pc--${red ? 'red' : 'black'}${dimmed ? ' pc--dim' : ''}`}>
      <span className={`pc__rank${rank === 'T' ? ' pc__rank--ten' : ''}`}>{display}</span>
      <span className="pc__suit">{SUIT_GLYPH[suit]}</span>
    </div>
  );
}

function HandEntry({ entry, texture }) {
  const reason = texture ? impossibleReason(entry.category, texture) : null;
  return (
    <li className={`hr-entry${reason ? ' hr-entry--impossible' : ''}`}>
      <div className="hr-entry__header">
        <span className="hr-entry__name">{entry.name}</span>
        {reason && <span className="hr-entry__tag">{reason}</span>}
      </div>
      <p className="hr-entry__blurb">{entry.blurb}</p>
      <div className="hr-entry__cards">
        <div className="hr-entry__making">
          {entry.making.map((c) => (
            <PlayingCard key={c} card={c} dimmed={false} />
          ))}
        </div>
        {entry.kickers.length > 0 && (
          <>
            <div className="hr-entry__sep" aria-hidden="true" />
            <div className="hr-entry__kickers">
              {entry.kickers.map((c) => (
                <PlayingCard key={c} card={c} dimmed={true} />
              ))}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

// InfoPopover is rendered as a sibling of HandRankingsModal (not inside it) so that
// position:fixed is relative to the viewport — backdrop-filter on the overlay would
// otherwise make it a new containing block, breaking fixed positioning.
function InfoPopover({ which, pos, onClose }) {
  const { title, body } = POPOVER_CONTENT[which];
  return (
    <>
      <div className="hr-popover-backdrop" onClick={onClose} />
      <div
        className="hr-popover"
        style={{ top: pos.top, left: pos.left, width: pos.width, '--arrow': `${pos.arrowOffset}px` }}
      >
        <strong className="hr-popover__title">{title}</strong>
        <p className="hr-popover__body">{body}</p>
      </div>
    </>
  );
}

function HandRankingsModal({ board, onClose, onInfoClick }) {
  const texture = board && board.length >= 3 ? possibleCategories(board) : null;

  return (
    <div className="hr-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Hand rankings">
      <div className="hr-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="hr-sheet__header">
          <div>
            <h2 className="hr-sheet__title">Hand Rankings</h2>
            {texture && (
              <p className="hr-sheet__board-note">Greyed hands can't be made on this board.</p>
            )}
          </div>
          <button className="hr-close" onClick={onClose} aria-label="Close hand rankings">
            ✕
          </button>
        </div>

        <div className="hr-legend">
          <div className="hr-legend__item">
            <span className="hr-legend__swatch hr-legend__swatch--solid" aria-hidden="true" />
            <span className="hr-legend__label">makes the hand</span>
            <button
              type="button"
              className="hr-info-btn"
              aria-label="What does 'makes the hand' mean?"
              onClick={(e) => onInfoClick('making', e.currentTarget)}
            >
              <span className="hr-info-icon" aria-hidden="true">i</span>
            </button>
          </div>
          <div className="hr-legend__item">
            <span className="hr-legend__swatch hr-legend__swatch--dim" aria-hidden="true" />
            <span className="hr-legend__label">kicker</span>
            <button
              type="button"
              className="hr-info-btn"
              aria-label="What is a kicker?"
              onClick={(e) => onInfoClick('kicker', e.currentTarget)}
            >
              <span className="hr-info-icon" aria-hidden="true">i</span>
            </button>
          </div>
        </div>

        <ol className="hr-list">
          {HAND_RANKINGS.map((entry) => (
            <HandEntry key={entry.category} entry={entry} texture={texture} />
          ))}
        </ol>
      </div>
    </div>
  );
}

export function HandRankingsTrigger({ board }) {
  const [open, setOpen] = useState(false);
  const [popover, setPopover] = useState(null);

  function handleInfoClick(which, buttonEl) {
    if (popover?.which === which) {
      setPopover(null);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    const margin = 12;
    const vw = window.innerWidth;
    const width = Math.min(268, vw - 2 * margin);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));
    const arrowOffset = rect.left + rect.width / 2 - left;
    setPopover({ which, pos: { top: rect.bottom + 6, left, width, arrowOffset } });
  }

  function close() {
    setOpen(false);
    setPopover(null);
  }

  return (
    <>
      <button
        className="hr-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open hand rankings guide"
        aria-haspopup="dialog"
      >
        <div className="hr-trigger__fan" aria-hidden="true">
          <div className="hr-trigger__card hr-trigger__card--back">
            <span className="hr-trigger__mini-rank">K</span>
            <span className="hr-trigger__mini-suit">{SUIT_GLYPH.h}</span>
          </div>
          <div className="hr-trigger__card hr-trigger__card--front">
            <span className="hr-trigger__mini-rank">A</span>
            <span className="hr-trigger__mini-suit">{SUIT_GLYPH.s}</span>
          </div>
        </div>
        <span className="hr-trigger__label">Hands</span>
      </button>

      {open && (
        <HandRankingsModal
          board={board}
          onClose={close}
          onInfoClick={handleInfoClick}
        />
      )}

      {popover && (
        <InfoPopover
          which={popover.which}
          pos={popover.pos}
          onClose={() => setPopover(null)}
        />
      )}
    </>
  );
}
