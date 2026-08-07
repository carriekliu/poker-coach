import { useState } from 'react';
import './SetupScreen.css';

function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// Work in integer units (1/100ths) to avoid float modulo issues.
function canMakeAmount(amount, denomValues) {
  if (!denomValues.length || amount <= 0) return false;
  const scale = 100;
  const intAmount = Math.round(amount * scale);
  const intDenoms = denomValues.map(v => Math.round(v * scale));
  const g = intDenoms.reduce(gcd, 0);
  return g > 0 && intAmount % g === 0;
}

let _nextId = 4;

export function SetupScreen({ onStart, onShowIntro }) {
  const [players, setPlayers] = useState(6);
  const [smallBlind, setSmallBlind] = useState('1');
  const [bigBlind, setBigBlind] = useState('2');
  const [denoms, setDenoms] = useState([
    { id: 1, value: '1', count: '10' },
    { id: 2, value: '5', count: '10' },
    { id: 3, value: '25', count: '4' },
  ]);

  const startingStack = denoms.reduce((sum, d) => {
    const v = parseFloat(d.value);
    const c = parseInt(d.count, 10);
    return sum + (isFinite(v) && v > 0 && isFinite(c) && c > 0 ? v * c : 0);
  }, 0);

  const sb = parseFloat(smallBlind) || 0;
  const bb = parseFloat(bigBlind) || 0;
  const stackBBs = bb > 0 && startingStack > 0 ? startingStack / bb : 0;
  const shortStack = stackBBs > 0 && stackBBs < 25;

  const validDenomValues = denoms
    .map(d => parseFloat(d.value))
    .filter(v => isFinite(v) && v > 0);

  const sbUnmakeable = sb > 0 && validDenomValues.length > 0 && !canMakeAmount(sb, validDenomValues);

  function addDenom() {
    setDenoms(prev => [...prev, { id: _nextId++, value: '', count: '10' }]);
  }

  function removeDenom(id) {
    setDenoms(prev => prev.filter(d => d.id !== id));
  }

  function updateDenom(id, field, value) {
    setDenoms(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onStart({
      players: Number(players),
      smallBlind: sb,
      bigBlind: bb,
      denominations: denoms
        .map(d => ({ value: parseFloat(d.value), count: parseInt(d.count, 10) }))
        .filter(d => isFinite(d.value) && d.value > 0 && isFinite(d.count) && d.count > 0),
      startingStack,
    });
  }

  const canSubmit = players >= 2 && sb > 0 && bb >= sb && startingStack > 0;

  return (
    <div className="setup-screen">
      <header className="setup-header">
        <h1>New Game</h1>
      </header>

      <form className="setup-form" onSubmit={handleSubmit}>
        <section className="setup-card">
          <h2 className="section-title">Table</h2>

          <div className="field field--row">
            <span className="field-label">Players (including you)</span>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setPlayers(p => Math.max(2, p - 1))}
                aria-label="Fewer players"
              >−</button>
              <span className="stepper-value">{players}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setPlayers(p => Math.min(10, p + 1))}
                aria-label="More players"
              >+</button>
            </div>
          </div>

          <div className="blinds-row">
            <div className="field field--col">
              <label className="field-label" htmlFor="sb">Small blind</label>
              <input
                id="sb"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={smallBlind}
                onChange={e => setSmallBlind(e.target.value)}
                className={`num-input ${sbUnmakeable ? 'num-input--warn' : ''}`}
              />
            </div>
            <div className="field field--col">
              <label className="field-label" htmlFor="bb">Big blind</label>
              <input
                id="bb"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={bigBlind}
                onChange={e => setBigBlind(e.target.value)}
                className="num-input"
              />
            </div>
          </div>

          {sbUnmakeable && (
            <div className="warning-box" role="alert">
              <span className="warning-icon">⚠</span>
              <span>
                <strong>Small blind of {sb} can't be made</strong> with these chip denominations.
                Adjust the blinds or add a chip of the right value.
              </span>
            </div>
          )}
        </section>

        <section className="setup-card">
          <h2 className="section-title">Chips per player</h2>

          <div className="denom-list">
            <div className="denom-header" aria-hidden="true">
              <span>Denomination</span>
              <span>Count</span>
              <span />
            </div>
            {denoms.map((d, i) => (
              <div key={d.id} className="denom-row">
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 25"
                  value={d.value}
                  onChange={e => updateDenom(d.id, 'value', e.target.value)}
                  aria-label={`Denomination ${i + 1} value`}
                  className="num-input"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="10"
                  value={d.count}
                  onChange={e => updateDenom(d.id, 'count', e.target.value)}
                  aria-label={`Denomination ${i + 1} count`}
                  className="num-input"
                />
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeDenom(d.id)}
                  aria-label={`Remove ${d.value || `row ${i + 1}`}`}
                >×</button>
              </div>
            ))}
          </div>

          <button type="button" className="add-btn" onClick={addDenom}>
            + Add denomination
          </button>

          <div className="stack-summary">
            <span className="stack-label">
              Starting stack: <strong>{startingStack.toLocaleString()}</strong>
            </span>
            {stackBBs > 0 && (
              <span className={`bb-badge ${shortStack ? 'bb-badge--warn' : 'bb-badge--ok'}`}>
                {Math.round(stackBBs)} BB
              </span>
            )}
          </div>

          {shortStack && (
            <div className="warning-box" role="alert">
              <span className="warning-icon">⚠</span>
              <span>
                <strong>Only {Math.round(stackBBs)} big blinds.</strong> Short stacks collapse
                play to all-in-or-fold, skipping the postflop decisions this coach exists to
                teach. Aim for at least 25 BB — add more chips or lower the blinds.
              </span>
            </div>
          )}
        </section>

        <button type="submit" className="start-btn" disabled={!canSubmit}>
          Start Session
        </button>

        {onShowIntro && (
          <button type="button" className="setup-intro-link" onClick={onShowIntro}>
            Reopen intro guide
          </button>
        )}
      </form>
    </div>
  );
}
