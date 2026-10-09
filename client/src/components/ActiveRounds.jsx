import { useRef, useState } from 'react';
import { Link } from 'react-router';
import SectionLabel from './SectionLabel.jsx';

const SWIPE_THRESHOLD = 40;
// How long an ended row takes to slide out and close up — matches the
// duration-200 classes below
const LEAVE_MS = 200;

// One round row. Swipe left to reveal "End round", swipe right to hide it again.
// onEnd() returns a promise (the PATCH); onGone() drops the row from the list
// once it has slid away.
function RoundRow({ round, onEnd, onGone }) {
  const [revealed, setRevealed] = useState(false);
  // 'idle' → 'ending' (waiting for the server) → 'leaving' (sliding out)
  const [phase, setPhase] = useState('idle');
  const startX = useRef(null);
  const leaving = phase === 'leaving';

  function handlePointerUp(e) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (dx < -SWIPE_THRESHOLD) setRevealed(true);
    else if (dx > SWIPE_THRESHOLD) setRevealed(false);
    startX.current = null;
  }

  // The row slides out only once the server has ended the round: on failure
  // it stays where it is (Home shows the error) so it can be tried again
  async function handleEnd() {
    setPhase('ending');
    try {
      await onEnd();
    } catch {
      setPhase('idle');
      return;
    }
    setPhase('leaving');
    // A timer rather than transitionend, which never fires when reduced
    // motion turns the transition off — the row would stay forever
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(onGone, reduce ? 0 : LEAVE_MS);
  }

  // Ending a round (Jui, 2026-10-09 — not in the design): the card slides
  // out to the left, the way it was already swiped, and fades, while the row
  // closes up so the ones below move up smoothly. The one-row grid going
  // 1fr → 0fr is the same trick as Orders' round panels. The 8px gap lives
  // inside the row (pb-2) so it closes up with it instead of jumping away at
  // the end; overflow-hidden only while leaving, so it doesn't clip the
  // card's shadow the rest of the time.
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
        leaving ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
      }`}
    >
      <div className={`min-h-0 ${leaving ? 'overflow-hidden' : ''}`}>
        <div className="pb-2">
          <div
            // translate, not transform: Tailwind v4's -translate-x-full sets
            // the CSS translate property, which transition-[transform]
            // wouldn't animate
            className={`relative overflow-hidden rounded-md bg-surface-raised shadow-sm transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none ${
              leaving ? '-translate-x-full opacity-0' : ''
            }`}
          >
            <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-brand">
              <button
                type="button"
                onClick={handleEnd}
                disabled={phase !== 'idle'}
                tabIndex={revealed ? 0 : -1}
                className="size-full text-body-small font-semibold text-on-brand"
              >
                {/* Something to see while the PATCH is on its way */}
                {phase === 'ending' ? 'Ending…' : 'End round'}
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
        </div>
      </div>
    </div>
  );
}

// rounds: [{ _id, name, earnings }] — every round that hasn't been ended yet
function ActiveRounds({ rounds, onEnd, onGone }) {
  return (
    // No flex gap: each row carries its own 8px below it (see RoundRow), which
    // also spaces the last row from "Start a new round" — a gap would add
    // another 8px there
    <div className="flex flex-col">
      <div className="mb-2">
        <SectionLabel>Active rounds</SectionLabel>
      </div>
      {rounds.map((round) => (
        <RoundRow
          key={round._id}
          round={round}
          onEnd={() => onEnd(round._id)}
          onGone={() => onGone(round._id)}
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
