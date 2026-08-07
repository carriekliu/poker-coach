import { useState, useRef } from 'react';
import './IntroFlow.css';

const TOTAL = 4;

// ── Card content ──────────────────────────────────────────────────────────

function Card0({ depth, onSelect }) {
  return (
    <div className="icard">
      <div className="icard__icon" aria-hidden="true">🃏</div>
      <h2 className="icard__title">Before you play</h2>
      <p className="icard__body">
        Have you played Texas Hold'em before?
      </p>
      <div className="icard__options">
        <button
          className={`icard__opt${depth === 'beginner' ? ' icard__opt--sel' : ''}`}
          onClick={() => onSelect('beginner')}
        >
          Never played
        </button>
        <button
          className={`icard__opt${depth === 'some' ? ' icard__opt--sel' : ''}`}
          onClick={() => onSelect('some')}
        >
          Played a bit
        </button>
      </div>
    </div>
  );
}

function Card1({ depth }) {
  return (
    <div className="icard">
      <div className="icard__icon" aria-hidden="true">🎯</div>
      <h2 className="icard__title">The aim</h2>

      {depth === 'some' ? (
        <div className="icard__body">
          <p>Two private hole cards. Five shared cards dealt in stages. Make the best 5-card hand from any combination of the seven.</p>
          <p className="icard__spacer">Bet when you have an edge. Fold when the math doesn't work. Win by having the best hand — or by convincing everyone else to fold.</p>
        </div>
      ) : (
        <div className="icard__body">
          <p>You and up to nine others each get <strong>two private cards</strong> — your hole cards. Five shared cards are dealt face-up in the middle over four rounds.</p>
          <p className="icard__spacer">Everyone makes the best 5-card hand they can from <strong>any combination</strong> of their two cards and the five shared ones.</p>
          <p className="icard__spacer">Between each round, players bet on whether their hand can win. You can fold at any point to stop losing chips.</p>
          <p className="icard__spacer icard__highlight">Key insight: you can also win without the best hand — bet confidently enough and everyone else folds.</p>
        </div>
      )}
    </div>
  );
}

const STREETS_BEGINNER = [
  { label: 'Blinds',        desc: 'Two players post forced bets to start the pot', bet: false },
  { label: 'Hole cards',    desc: 'Everyone gets 2 private cards',                 bet: false },
  { label: 'Bet',           desc: 'Call, raise, or fold',                          bet: true  },
  { label: 'Flop',          desc: '3 shared cards revealed',                       bet: false },
  { label: 'Bet',           desc: null,                                            bet: true  },
  { label: 'Turn',          desc: '1 more shared card',                            bet: false },
  { label: 'Bet',           desc: null,                                            bet: true  },
  { label: 'River',         desc: 'The final shared card',                         bet: false },
  { label: 'Bet',           desc: null,                                            bet: true  },
  { label: 'Showdown',      desc: 'Remaining players reveal hands; best wins',     bet: false },
];

const STREETS_COMPACT = ['Blinds', 'Hole cards', 'Flop', 'Turn', 'River', 'Showdown'];

function Card2({ depth }) {
  return (
    <div className="icard icard--scroll">
      <h2 className="icard__title">Order of play</h2>

      {depth === 'some' ? (
        <div className="icard__compact-flow">
          {STREETS_COMPACT.map((s, i) => (
            <span key={s}>
              <span className="icard__pill">{s}</span>
              {i < STREETS_COMPACT.length - 1 && (
                <span className="icard__arrow">
                  {i < STREETS_COMPACT.length - 2 ? ' › bet › ' : ' › '}
                </span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <ol className="icard__timeline">
          {STREETS_BEGINNER.map((step, i) => (
            <li
              key={i}
              className={`icard__step${step.bet ? ' icard__step--bet' : ''}`}
            >
              <div className="icard__step-body">
                <span className="icard__step-label">{step.label}</span>
                {step.desc && (
                  <span className="icard__step-desc">{step.desc}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Card3() {
  return (
    <div className="icard">
      <h2 className="icard__title">What this app does</h2>

      <ul className="icard__features">
        <li className="icard__feature">
          <span className="icard__feat-icon" aria-hidden="true">
            <span className="feat-cards">
              <span className="feat-card">A<br/>♠</span>
              <span className="feat-card feat-card--back" />
            </span>
          </span>
          <div className="icard__feat-text">
            <strong>Hand guide</strong>
            <span>The two-card icon in the top-right of every screen opens rankings and definitions. Tap the&nbsp;(i) next to any term for a plain-English explanation.</span>
          </div>
        </li>

        <li className="icard__feature">
          <span className="icard__feat-icon" aria-hidden="true">
            <span className="feat-tap">↙</span>
          </span>
          <div className="icard__feat-text">
            <strong>Card entry</strong>
            <span>Tap your circle at the bottom of the table to log your hole cards, and tap the board strip in the centre to enter shared cards as they're dealt.</span>
          </div>
        </li>

        <li className="icard__feature">
          <span className="icard__feat-icon" aria-hidden="true">
            <span className="feat-pct">%</span>
          </span>
          <div className="icard__feat-text">
            <strong>Coaching panel</strong>
            <span>Live equity against active players, outs (with a clean vs. marginal split), the strongest possible hand on the board, and which hands the board can't make.</span>
          </div>
        </li>
      </ul>
    </div>
  );
}

// ── Main flow ─────────────────────────────────────────────────────────────

export function IntroFlow({ onComplete }) {
  const [slide, setSlide]   = useState(0);
  const [depth, setDepth]   = useState(null); // null | 'beginner' | 'some'
  const [dragX, setDragX]   = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX = useRef(null);

  function goTo(n)  { if (n >= 0 && n < TOTAL) setSlide(n); }
  function next()   { if (slide < TOTAL - 1) setSlide((s) => s + 1); else onComplete(); }
  function prev()   { if (slide > 0) setSlide((s) => s - 1); }

  function selectDepth(d) {
    setDepth(d);
    setSlide(1);
  }

  // ── Touch ──
  function onTouchStart(e) {
    touchStartX.current = e.targetTouches[0].clientX;
    setDragging(true);
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return;
    const dx = e.targetTouches[0].clientX - touchStartX.current;
    const atLeft  = slide === 0 && dx > 0;
    const atRight = slide === TOTAL - 1 && dx < 0;
    setDragX(atLeft || atRight ? dx * 0.15 : dx); // rubber-band at edges
  }

  function onTouchEnd() {
    setDragging(false);
    if (dragX < -48) next();
    else if (dragX > 48) prev();
    setDragX(0);
    touchStartX.current = null;
  }

  const isLastCard   = slide === TOTAL - 1;
  const showNextBtn  = slide > 0 || depth !== null;
  const isCard0      = slide === 0;

  return (
    <div className="intro-shell">
      {/* Skip */}
      <button className="intro-skip" onClick={onComplete} type="button">
        Skip
      </button>

      {/* Swipeable area */}
      <div
        className="intro-slider"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="intro-track"
          style={{
            transform: `translateX(calc(${-slide} * 100vw + ${dragX}px))`,
            transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="intro-slide"><Card0 depth={depth} onSelect={selectDepth} /></div>
          <div className="intro-slide"><Card1 depth={depth} /></div>
          <div className="intro-slide"><Card2 depth={depth} /></div>
          <div className="intro-slide"><Card3 /></div>
        </div>
      </div>

      {/* Dots */}
      <div className="intro-dots" role="tablist" aria-label="Intro progress">
        {Array.from({ length: TOTAL }, (_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === slide}
            className={`intro-dot${i === slide ? ' intro-dot--on' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Nav */}
      <div className="intro-nav">
        <button
          className="intro-nav-btn intro-nav-btn--back"
          onClick={prev}
          style={{ visibility: slide > 0 ? 'visible' : 'hidden' }}
          type="button"
        >
          Back
        </button>

        <span className="intro-nav-hint" aria-live="polite">
          {isCard0 && !depth ? 'Choose an option to continue' : ''}
        </span>

        {isLastCard ? (
          <button className="intro-nav-btn intro-nav-btn--cta" onClick={onComplete} type="button">
            Let's play
          </button>
        ) : showNextBtn ? (
          <button className="intro-nav-btn intro-nav-btn--next" onClick={next} type="button">
            Next
          </button>
        ) : (
          <span style={{ width: 70 }} /> /* placeholder to keep layout stable */
        )}
      </div>
    </div>
  );
}
