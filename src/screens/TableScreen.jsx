import { useState, useMemo } from 'react';
import { CardPicker } from '../components/CardPicker.jsx';
import { CoachPanel } from '../components/CoachPanel.jsx';
import { street } from '../engine/board.js';
import { cardToGlyph, isRedSuit, rankOf, suitOf } from '../engine/cards.js';
import './TableScreen.css';

// ── Seat positions on the oval felt ──────────────────────────────────────
// [left%, top%] for hero (index 0) and each opponent. The hero is always
// at the bottom-centre; opponents fan clockwise across the top arc.
const POSITIONS = {
  2:  [[50,87],[50,10]],
  3:  [[50,87],[18,22],[82,22]],
  4:  [[50,87],[10,50],[50,10],[90,50]],
  5:  [[50,87],[12,60],[22,16],[78,16],[88,60]],
  6:  [[50,87],[10,55],[20,16],[50, 8],[80,16],[90,55]],
  7:  [[50,87],[10,62],[14,32],[32,10],[68,10],[86,32],[90,62]],
  8:  [[50,87],[8,65],[10,38],[24,12],[50, 6],[76,12],[90,38],[92,65]],
  9:  [[50,87],[8,68],[10,42],[20,18],[42, 8],[58, 8],[80,18],[90,42],[92,68]],
  10: [[50,87],[8,68],[8,44],[16,22],[34, 8],[50, 4],[66, 8],[84,22],[92,44],[92,68]],
};

function seatPositions(n) {
  return POSITIONS[n] ?? POSITIONS[10];
}

// ── Queue helpers ─────────────────────────────────────────────────────────
function buildQueue(startSeat, foldedArr, n) {
  const q = [];
  for (let i = 0; i < n; i++) {
    const s = (startSeat + i) % n;
    if (!foldedArr[s]) q.push(s);
  }
  return q;
}

// ── Mini playing card ─────────────────────────────────────────────────────
function MiniCard({ card }) {
  const rank = rankOf(card);
  const suit = suitOf(card);
  const red = isRedSuit(suit);
  return (
    <div className={`mini-card mini-card--${red ? 'red' : 'black'}`}>
      {cardToGlyph(card)}
    </div>
  );
}

function CardBack() {
  return <div className="mini-card mini-card--back" />;
}

// ── Chip button ───────────────────────────────────────────────────────────
function ChipBtn({ value, onClick }) {
  return (
    <button className="chip-btn" onClick={onClick} type="button">
      {value.toLocaleString()}
    </button>
  );
}

// ── Seat circle ───────────────────────────────────────────────────────────
function SeatCircle({ seat, isHero, isActive, isFolded, isDealer, isSB, isBB, stack, bet, holeCards, onClick }) {
  const badges = [];
  if (isDealer) badges.push({ key: 'D', label: 'D', cls: 'badge--dealer' });
  if (isSB) badges.push({ key: 'SB', label: 'SB', cls: 'badge--blind' });
  if (isBB) badges.push({ key: 'BB', label: 'BB', cls: 'badge--blind' });

  return (
    <button
      className={[
        'seat',
        isHero ? 'seat--hero' : 'seat--opp',
        isActive ? 'seat--active' : '',
        isFolded ? 'seat--folded' : '',
      ].join(' ')}
      onClick={onClick}
      type="button"
      aria-label={isHero ? 'Hero' : `Player ${seat + 1}`}
    >
      {/* Cards */}
      {isHero && holeCards.length === 2 ? (
        <div className="seat__cards">
          {holeCards.map((c) => <MiniCard key={c} card={c} />)}
        </div>
      ) : isHero ? (
        <span className="seat__tap-hint">tap to<br />enter cards</span>
      ) : (
        <div className="seat__cards seat__cards--back">
          <CardBack /><CardBack />
        </div>
      )}

      {/* Label below circle */}
      <div className="seat__info">
        <span className="seat__stack">{stack.toLocaleString()}</span>
        {bet > 0 && <span className="seat__bet">{bet.toLocaleString()}</span>}
      </div>

      {/* Badges (D, SB, BB) */}
      {badges.map((b) => (
        <span key={b.key} className={`seat-badge ${b.cls}`}>{b.label}</span>
      ))}
    </button>
  );
}

// ── Board cards strip ─────────────────────────────────────────────────────
function BoardStrip({ cards, onTap }) {
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);
  return (
    <button className="board-strip" onClick={onTap} type="button" aria-label="Edit board cards">
      {slots.map((card, i) => (
        card !== null
          ? <MiniCard key={i} card={card} />
          : <div key={i} className="board-slot-empty" />
      ))}
    </button>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export function TableScreen({ config, onBack }) {
  const N = config.players;

  // ── Hand state ──
  const [dealerSeat, setDealerSeat] = useState(1 % N);
  const [folded,  setFolded]  = useState(() => Array(N).fill(false));
  const [stacks,  setStacks]  = useState(() => Array(N).fill(config.startingStack));
  const [bets,    setBets]    = useState(() => Array(N).fill(0));
  const [pot,     setPot]     = useState(0);
  const [toCall,  setToCall]  = useState(0); // total to call (not additional)
  const [actionQueue, setActionQueue] = useState([]);
  const [handActive,  setHandActive]  = useState(false);

  // ── Card state ──
  // Camera integration: external code calls setHoleCards(cards) / setBoardCards(cards)
  // with an array of card integers — same signature as the card picker.
  const [holeCards,  setHoleCards]  = useState([]);
  const [boardCards, setBoardCards] = useState([]);

  // ── UI state ──
  const [raiseMode,   setRaiseMode]   = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [picker, setPicker] = useState(null); // null | { mode, label, max, blocked, initial }

  // ── Derived ──────────────────────────────────────────────────────────────
  const sbSeat = (dealerSeat + 1) % N;
  const bbSeat = (dealerSeat + 2) % N;
  const activeSeat  = actionQueue[0] ?? null;
  const activeCount = folded.filter((f) => !f).length;
  const positions   = seatPositions(N);

  // Street is derived from board cards — never stored
  const currentStreet = boardCards.length >= 3 ? street(boardCards) : 'preflop';

  // After a betting round the app waits for board entry or declares the hand over
  const roundDone    = handActive && actionQueue.length === 0;
  const handOver     = roundDone && (activeCount <= 1 || (boardCards.length === 5 && activeCount > 1));
  const needsBoard   = roundDone && activeCount > 1 && boardCards.length < 5 && !handOver;
  const nextCardMode = needsBoard
    ? boardCards.length === 0 ? 'flop' : 'street'
    : null;

  // Hero's cost to call
  const heroToCall = Math.max(0, toCall - bets[0]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function advance(newFolded, newBets, newToCall, newPot, currentQueue) {
    const next = currentQueue.slice(1);
    const remaining = next.filter((s) => !newFolded[s]);
    setFolded(newFolded);
    setBets(newBets);
    setPot(newPot);
    setToCall(newToCall);
    setActionQueue(remaining);
  }

  function startHand() {
    const newDealer = (dealerSeat + 1) % N;
    const sb = (newDealer + 1) % N;
    const bb = (newDealer + 2) % N;

    const newStacks = [...stacks];
    const newBets   = Array(N).fill(0);
    const newFolded = Array(N).fill(false);

    const sbAmt = Math.min(config.smallBlind, newStacks[sb]);
    const bbAmt = Math.min(config.bigBlind,   newStacks[bb]);
    newBets[sb]   = sbAmt;   newStacks[sb]   -= sbAmt;
    newBets[bb]   = bbAmt;   newStacks[bb]   -= bbAmt;

    const utg = (bb + 1) % N;
    const queue = buildQueue(utg, newFolded, N);

    setDealerSeat(newDealer);
    setFolded(newFolded);
    setStacks(newStacks);
    setBets(newBets);
    setPot(sbAmt + bbAmt);
    setToCall(config.bigBlind);
    setActionQueue(queue);
    setHoleCards([]);
    setBoardCards([]);
    setHandActive(true);
    setRaiseMode(false);
    setRaiseAmount(0);
  }

  function startStreet(newBoard) {
    const newPot  = pot + bets.reduce((a, b) => a + b, 0);
    const newBets = Array(N).fill(0);
    const queue   = buildQueue((dealerSeat + 1) % N, folded, N);
    setBoardCards(newBoard);
    setPot(newPot);
    setBets(newBets);
    setToCall(0);
    setActionQueue(queue);
    setRaiseMode(false);
    setRaiseAmount(0);
  }

  function doFold() {
    const seat = actionQueue[0];
    const nf = [...folded]; nf[seat] = true;
    advance(nf, bets, toCall, pot, actionQueue);
  }

  function doCall() {
    const seat = actionQueue[0];
    const extra = Math.min(Math.max(0, toCall - bets[seat]), stacks[seat]);
    const nb = [...bets]; nb[seat] += extra;
    const ns = [...stacks]; ns[seat] -= extra;
    setStacks(ns);
    advance(folded, nb, toCall, pot + extra, actionQueue);
  }

  function doRaise() {
    const seat  = actionQueue[0];
    const total = raiseAmount;
    const extra = Math.max(0, total - bets[seat]);
    const nb = [...bets]; nb[seat] = total;
    const ns = [...stacks]; ns[seat] -= extra;
    // Queue everyone else, starting next seat
    const nq = buildQueue((seat + 1) % N, folded, N).filter((s) => s !== seat);
    setStacks(ns);
    setToCall(total);
    setBets(nb);
    setPot(pot + extra);
    setActionQueue(nq);
    setRaiseMode(false);
    setRaiseAmount(0);
  }

  // Tap a seat directly (out-of-order correction)
  function handleSeatTap(seat) {
    if (!handActive || !actionQueue.includes(seat)) return;
    // Move tapped seat to the front of the queue
    const rest = actionQueue.filter((s) => s !== seat);
    setActionQueue([seat, ...rest]);
  }

  // Open card picker
  function openHolePicker() {
    setPicker({
      mode: 'hole',
      label: 'Pick hole cards',
      max: 2,
      blocked: new Set(boardCards),
      initial: holeCards,
    });
  }

  function openBoardPicker(mode) {
    if (mode === 'flop') {
      setPicker({ mode: 'flop', label: 'Enter flop (3 cards)', max: 3, blocked: new Set(holeCards), initial: [] });
    } else {
      // turn or river — pick 1 card to append
      const label = boardCards.length === 3 ? 'Enter turn card' : 'Enter river card';
      setPicker({ mode: 'append1', label, max: 1, blocked: new Set([...holeCards, ...boardCards]), initial: [] });
    }
  }

  function handlePickerConfirm(cards) {
    const { mode } = picker;
    setPicker(null);
    if (mode === 'hole') {
      setHoleCards(cards);
    } else if (mode === 'flop') {
      startStreet(cards);
    } else if (mode === 'append1') {
      startStreet([...boardCards, ...cards]);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const showActions = handActive && !raiseMode && actionQueue.length > 0;
  const showRaise   = handActive && raiseMode;
  const isCheck     = toCall === 0 || heroToCall === 0;
  const callLabel   = isCheck ? 'Check' : `Call  ${heroToCall.toLocaleString()}`;

  return (
    <div className="table-screen">
      {/* ── Felt ── */}
      <div className="felt">
        {/* Opponent + hero seats */}
        {Array.from({ length: N }, (_, i) => {
          const [lp, tp] = positions[i];
          return (
            <div
              key={i}
              className="seat-anchor"
              style={{ left: `${lp}%`, top: `${tp}%` }}
            >
              <SeatCircle
                seat={i}
                isHero={i === 0}
                isActive={activeSeat === i}
                isFolded={folded[i]}
                isDealer={dealerSeat === i}
                isSB={sbSeat === i}
                isBB={bbSeat === i}
                stack={stacks[i]}
                bet={bets[i]}
                holeCards={i === 0 ? holeCards : []}
                onClick={i === 0 ? openHolePicker : () => handleSeatTap(i)}
              />
            </div>
          );
        })}

        {/* Centre: pot + board */}
        <div className="felt__centre">
          {pot > 0 && (
            <div className="felt__pot">Pot  {pot.toLocaleString()}</div>
          )}
          <div className="felt__street">
            {handActive ? currentStreet.toUpperCase() : 'NO HAND'}
          </div>
          <BoardStrip
            cards={boardCards}
            onTap={() => {
              if (!handActive) return;
              if (needsBoard) openBoardPicker(nextCardMode);
              else if (boardCards.length > 0) openBoardPicker(boardCards.length === 0 ? 'flop' : 'street');
            }}
          />
          {needsBoard && (
            <button
              className="deal-btn deal-btn--board"
              onClick={() => openBoardPicker(nextCardMode)}
              type="button"
            >
              {boardCards.length === 0 ? 'Enter flop' : boardCards.length === 3 ? 'Enter turn' : 'Enter river'}
            </button>
          )}
          {handOver && boardCards.length < 5 && (
            <div className="felt__over">Hand over — one player remains</div>
          )}
          {handOver && boardCards.length === 5 && (
            <div className="felt__over">Showdown</div>
          )}
        </div>
      </div>

      {/* ── Action area ── */}
      <div className="action-area">
        {!handActive && (
          <button className="deal-btn" onClick={startHand} type="button">
            Deal hand
          </button>
        )}

        {handOver && (
          <button className="deal-btn" onClick={startHand} type="button">
            Next hand
          </button>
        )}

        {showActions && (
          <div className="action-btns">
            <span className="action-whose">
              {activeSeat === 0 ? 'Your turn' : `Player ${activeSeat + 1}`}
            </span>
            <div className="action-row">
              <button className="act-btn act-btn--fold" onClick={doFold} type="button">Fold</button>
              <button className="act-btn act-btn--call" onClick={doCall} type="button">{callLabel}</button>
              <button className="act-btn act-btn--raise" onClick={() => setRaiseMode(true)} type="button">Raise</button>
            </div>
          </div>
        )}

        {showRaise && (
          <div className="raise-panel">
            <div className="raise-panel__header">
              <span className="raise-panel__label">Raise to</span>
              <span className="raise-panel__total">{raiseAmount.toLocaleString()}</span>
              <button className="raise-panel__clear" onClick={() => setRaiseAmount(0)} type="button">Clear</button>
              <button className="raise-panel__cancel" onClick={() => { setRaiseMode(false); setRaiseAmount(0); }} type="button">✕</button>
            </div>
            <div className="chip-row">
              {config.denominations.map((d) => (
                <ChipBtn
                  key={d.value}
                  value={d.value}
                  onClick={() => setRaiseAmount((a) => a + d.value)}
                />
              ))}
            </div>
            <button
              className="deal-btn"
              onClick={doRaise}
              disabled={raiseAmount <= toCall}
              type="button"
            >
              Raise to {raiseAmount.toLocaleString()}
            </button>
          </div>
        )}
      </div>

      {/* ── Coaching ── */}
      {holeCards.length === 2 && (
        <CoachPanel
          holeCards={holeCards}
          boardCards={boardCards}
          opponents={Math.max(1, activeCount - 1)}
          toCall={heroToCall}
          pot={pot}
        />
      )}

      {/* ── Card picker modal ── */}
      {picker && (
        <CardPicker
          label={picker.label}
          maxCards={picker.max}
          blocked={picker.blocked}
          initial={picker.initial}
          onConfirm={handlePickerConfirm}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Back button */}
      <button className="table-back-btn" onClick={onBack} type="button" aria-label="Back to setup">
        ←
      </button>
    </div>
  );
}
