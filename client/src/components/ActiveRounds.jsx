import { useRef, useState } from 'react';
import { Link } from 'react-router';
import SectionLabel from './SectionLabel.jsx';

const SWIPE_THRESHOLD = 40;

// One round row. Swipe left to reveal "End round", swipe right to hide it again.
function RoundRow({ round, onEnd }) {
  const [revealed, setRevealed] = useState(false);
  const startX = useRef(null);

  function handlePointerUp(e) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (dx < -SWIPE_THRESHOLD) setRevealed(true);
    else if (dx > SWIPE_THRESHOLD) setRevealed(false);
    startX.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-md bg-surface-raised shadow-sm">
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-brand">
        <button
          type="button"
          onClick={onEnd}
          tabIndex={revealed ? 0 : -1}
          className="size-full text-body-small font-semibold text-on-brand"
        >
          End round
        </button>
      </div>
      <div
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => (startX.current = null)}
        className={`relative flex touch-pan-y items-center justify-between gap-2.5 bg-surface-raised px-4 py-3.5 transition-transform duration-200 ${
          revealed ? '-translate-x-24' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-status-done" />
          <span className="text-body font-semibold">{round.name}</span>
        </div>
        <span className="font-heading text-[16px] font-semibold text-status-done">
          ฿{round.earnings.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// rounds: [{ _id, name, earnings }] — every round that hasn't been ended yet
function ActiveRounds({ rounds, onEnd }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Active rounds</SectionLabel>
      {rounds.map((round) => (
        <RoundRow
          key={round._id}
          round={round}
          onEnd={() => onEnd(round._id)}
        />
      ))}
      <Link
        to="/rounds/new"
        className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-surface-peach p-2.5 text-button-secondary text-ink"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Start a new round
      </Link>
    </div>
  );
}

export default ActiveRounds;
