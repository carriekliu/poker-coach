import { useMemo } from 'react';
import { equity, outs, seededRng, potOdds } from '../engine/equity.js';
import { nuts, possibleCategories } from '../engine/board.js';
import { describe } from '../engine/evaluator.js';
import { cardToGlyph } from '../engine/cards.js';
import { impossibleReason } from '../data/handRankings.js';
import { HAND_RANKINGS } from '../data/handRankings.js';
import './CoachPanel.css';

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

function verdictLabel(eq) {
  if (eq >= 0.65) return { text: 'Strong favourite', cls: 'coach__verdict--good' };
  if (eq >= 0.52) return { text: 'Slight edge', cls: 'coach__verdict--ok' };
  if (eq >= 0.40) return { text: 'Slight underdog', cls: 'coach__verdict--warn' };
  return { text: 'Clear underdog', cls: 'coach__verdict--bad' };
}

export function CoachPanel({ holeCards, boardCards, opponents, toCall, pot }) {
  const data = useMemo(() => {
    if (holeCards.length !== 2 || opponents < 1) return null;

    try {
      const rng = seededRng([...holeCards, ...boardCards, opponents]);
      const eq = equity(holeCards, boardCards, opponents, { iterations: 1500, rng });

      let outsData = null;
      if (boardCards.length === 3 || boardCards.length === 4) {
        try {
          outsData = outs(holeCards, boardCards, opponents, { iterations: 300 });
        } catch { /* ignore */ }
      }

      let nutsData = null;
      let texture = null;
      if (boardCards.length >= 3) {
        try {
          nutsData = nuts(boardCards);
          texture = possibleCategories(boardCards);
        } catch { /* ignore */ }
      }

      return { eq, outsData, nutsData, texture };
    } catch {
      return null;
    }
  }, [holeCards, boardCards, opponents]);

  if (!data) return null;

  const { eq, outsData, nutsData, texture } = data;
  const verdict = verdictLabel(eq.equity);

  // Pot odds — only show when there's a bet to call
  const odds = toCall > 0 && pot > 0 ? potOdds(pot, toCall) : null;
  const callGood = odds !== null && eq.equity >= odds;

  // Impossible hands relevant to warn about
  const impossibleWarnings = texture
    ? HAND_RANKINGS
        .map((h) => ({ name: h.name, reason: impossibleReason(h.category, texture) }))
        .filter((h) => h.reason)
    : [];

  return (
    <div className="coach-panel">
      {/* Equity row */}
      <div className="coach__row coach__row--equity">
        <div className="coach__eq-main">
          <span className={`coach__verdict ${verdict.cls}`}>{verdict.text}</span>
          <span className="coach__eq-pct">{pct(eq.equity)}</span>
        </div>
        <div className="coach__eq-breakdown">
          W {pct(eq.win)} · T {pct(eq.tie)} · L {pct(eq.lose)}
        </div>
        {odds !== null && (
          <div className={`coach__odds ${callGood ? 'coach__odds--good' : 'coach__odds--bad'}`}>
            Pot odds {pct(odds)} — {callGood ? 'call has positive equity' : 'not enough equity to call'}
          </div>
        )}
      </div>

      {/* Outs */}
      {outsData && (
        <div className="coach__row coach__row--outs">
          <span className="coach__label">Outs</span>
          <span className="coach__outs-num">{outsData.cleanCount + outsData.marginalCount}</span>
          <span className="coach__outs-detail">
            against {opponents} {opponents === 1 ? 'player' : 'players'}
          </span>
          {(outsData.cleanCount > 0 || outsData.marginalCount > 0) && (
            <span className="coach__outs-breakdown">
              {outsData.cleanCount > 0 && `${outsData.cleanCount} clean`}
              {outsData.cleanCount > 0 && outsData.marginalCount > 0 && ' · '}
              {outsData.marginalCount > 0 && `${outsData.marginalCount} marginal`}
            </span>
          )}
        </div>
      )}

      {/* Nuts */}
      {nutsData && (
        <div className="coach__row coach__row--nuts">
          <span className="coach__label">Nuts</span>
          <span className="coach__nuts-cards">
            {nutsData.hole.map(cardToGlyph).join(' ')}
          </span>
          <span className="coach__nuts-name">{describe(nutsData.result)}</span>
        </div>
      )}

      {/* Board warnings */}
      {impossibleWarnings.length > 0 && (
        <div className="coach__row coach__row--board">
          {impossibleWarnings.map((w) => (
            <div key={w.name} className="coach__warning">
              <span className="coach__warning-name">{w.name}</span>
              <span className="coach__warning-reason">— {w.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
