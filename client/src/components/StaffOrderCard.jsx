import { useState } from 'react';
import { errorMessage, getJson } from '../api.js';
import {
  PENDING_WARN_MIN,
  READY_WARN_MIN,
  durationText,
  formatPhone,
  lineLabel,
  maskPhone,
  minutesSince,
} from '../constants/storefront.js';

// How long the card takes to slide away — matches duration-200
const LEAVE_MS = 200;

// The button that moves each kind of card on, and what it says while waiting
const ACTIONS = {
  pending_payment: {
    kind: 'confirm',
    label: 'ยืนยันจ่าย',
    busy: 'กำลังยืนยัน…',
  },
  cooking: { kind: 'ready', label: 'พร้อมรับ', busy: 'กำลังบันทึก…' },
  ready: { kind: 'pickup', label: 'ลูกค้ารับแล้ว', busy: 'กำลังบันทึก…' },
};

function ClockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// Orange "waited too long" badge, or a quiet grey one
function WaitBadge({ warn, children }) {
  return warn ? (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill bg-surface-peach px-2.5 py-1 text-badge text-status-pending">
      <ClockIcon />
      {children}
    </span>
  ) : (
    <span className="shrink-0 whitespace-nowrap rounded-pill bg-surface px-2.5 py-1 text-badge text-ink-muted">
      {children}
    </span>
  );
}

// "แยกดิป/ท็อปปิ้ง" under a line whose topping goes in a separate cup. Dark on
// purpose: unlike every status colour, so it can't be mistaken for one.
function SeparateToppingsBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-pill bg-ink px-2.5 py-0.5 text-badge text-on-brand">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7z" />
        <path d="M4 8h16" />
      </svg>
      แยกดิป/ท็อปปิ้ง
    </span>
  );
}

// The full number, tappable to call (cooking / ready tabs)
function PhoneLink({ name, phone }) {
  return (
    <a
      href={`tel:${phone}`}
      aria-label={`โทรหา ${name}`}
      className="inline-flex min-h-9 items-center gap-1.5 self-start text-button-secondary text-brand hover:text-brand-hover"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      </svg>
      {formatPhone(phone)}
    </a>
  );
}

// 72×72 queue number: blue while cooking, green when ready. "—" if the
// server crashed between claiming the order and numbering it (rare).
function QueueBox({ number, ready }) {
  return (
    <div
      className={`flex size-[72px] shrink-0 flex-col items-center justify-center rounded-md ${
        ready
          ? 'bg-status-done-bg text-status-done'
          : 'bg-status-delivered-bg text-status-delivered'
      }`}
    >
      <span className="text-[11px] font-semibold leading-[14px]">คิว</span>
      <span className="font-heading text-[32px] font-bold leading-9">
        {number ?? '—'}
      </span>
    </div>
  );
}

// One order on the /staff page (DESIGN §4.3–4.6). The same card for all three
// tabs; what it shows depends on the order's status.
//
// After a successful tap it slides out to the left and its row closes up, like
// Home's End round (Jui, 2026-11-11), then calls onGone so the page drops it.
// 409 means the other phone already moved this order: no red error, the page
// just refreshes (onConflict) and the card moves or disappears on its own.
function StaffOrderCard({ order, now, onGone, onConflict }) {
  // 'idle' → 'working' (waiting for the server) → 'leaving' (sliding out)
  const [phase, setPhase] = useState('idle');
  // Which button is waiting, so only that one says "…ing"
  const [workingKind, setWorkingKind] = useState(null);
  // Cancel needs two taps (Jui, 2026-11-11): it sits right next to Confirm
  // and can't be undone
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState('');

  const { status } = order;
  const action = ACTIONS[status];
  const leaving = phase === 'leaving';
  const busy = phase !== 'idle';

  async function move(kind) {
    setPhase('working');
    setWorkingKind(kind);
    setError('');
    try {
      await getJson(`/api/staff/orders/${order._id}/${kind}`, {
        method: 'PATCH',
      });
    } catch (err) {
      setPhase('idle');
      setConfirmingCancel(false);
      if (err.status === 409) onConflict();
      else setError(errorMessage(err));
      return;
    }
    setPhase('leaving');
    // A timer rather than transitionend, which never fires when reduced
    // motion turns the transition off — the card would stay forever
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => onGone(order._id), reduce ? 0 : LEAVE_MS);
  }

  function handleCancel() {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    move('cancel');
  }

  // How long it has waited at its current step
  const since = {
    pending_payment: order.createdAt,
    cooking: order.confirmedAt,
    ready: order.readyAt,
  }[status];
  const waitedMs = since ? now - new Date(since).getTime() : 0;
  const minutes = since ? minutesSince(since, now) : 0;
  const waited = durationText(minutes); // '' under a minute
  const warn =
    (status === 'pending_payment' && waitedMs > PENDING_WARN_MIN * 60000) ||
    (status === 'ready' && waitedMs > READY_WARN_MIN * 60000);

  // Toppings stand out in brand colour while the order is being made / handed
  // over, so a cup of นมข้น isn't forgotten (DESIGN §4.3)
  const highlightToppings = status !== 'pending_payment';

  return (
    // The one-row grid going 1fr → 0fr closes the gap as the card slides
    // away, the same trick as Home's End round; pb-3 keeps the 12px gap
    // inside the row so it closes up with it
    <li
      className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
        leaving ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
      }`}
    >
      <div className={`min-h-0 ${leaving ? 'overflow-hidden' : ''}`}>
        <article
          // translate, not transform: Tailwind v4's -translate-x-full sets
          // the CSS translate property
          className={`mb-3 flex flex-col gap-3 rounded-md bg-surface-raised p-4 shadow-sm transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none ${
            warn ? 'border-2 border-status-pending' : ''
          } ${leaving ? '-translate-x-full opacity-0' : ''}`}
        >
          {status === 'pending_payment' ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-heading text-[36px] font-bold leading-[44px]">
                  ฿{order.totalPrice}
                </span>
                <span className="break-words font-heading text-[22px] font-semibold leading-[30px]">
                  {order.customerName}
                </span>
              </div>
              <WaitBadge warn={warn}>
                {!waited ? 'เมื่อกี้' : warn ? `รอ ${waited}` : waited}
              </WaitBadge>
            </div>
          ) : (
            <div className="flex items-start gap-3.5">
              <QueueBox number={order.queueNumber} ready={status === 'ready'} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 break-words text-[18px] font-semibold leading-[26px]">
                    {order.customerName}
                  </span>
                  {status === 'cooking' ? (
                    <span className="shrink-0 whitespace-nowrap text-label text-ink-muted">
                      {waited ? `ยืนยัน ${waited}ก่อน` : 'ยืนยันเมื่อกี้'}
                    </span>
                  ) : warn ? (
                    <WaitBadge warn>{`พร้อม ${waited}แล้ว`}</WaitBadge>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap text-label text-ink-muted">
                      {waited ? `พร้อม ${waited}แล้ว` : 'เพิ่งพร้อม'}
                    </span>
                  )}
                </div>
                <PhoneLink
                  name={order.customerName}
                  phone={order.customerPhone}
                />
              </div>
            </div>
          )}

          <ul className="flex flex-col gap-1.5 border-t border-divider pt-3">
            {order.items.map((item, index) => (
              <li
                key={index}
                className={`text-[15px] font-semibold leading-[22px] ${
                  highlightToppings && item.category === 'topping'
                    ? 'text-brand'
                    : ''
                }`}
              >
                {lineLabel(item)}
                {item.separateToppings && (
                  <>
                    <br />
                    <SeparateToppingsBadge />
                  </>
                )}
              </li>
            ))}
          </ul>

          {status === 'pending_payment' && (
            <p className="text-label text-ink-muted">
              โทร {maskPhone(order.customerPhone)}
            </p>
          )}

          {error && (
            <p role="alert" className="text-body-small text-danger">
              {error}
            </p>
          )}

          {status === 'pending_payment' ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleCancel}
                aria-live="polite"
                className={`min-h-11 flex-1 rounded-md border px-2 text-button-secondary disabled:opacity-60 ${
                  confirmingCancel
                    ? 'border-danger bg-danger text-on-brand'
                    : 'border-danger-border bg-surface-raised text-danger'
                }`}
              >
                {workingKind === 'cancel' && busy
                  ? 'กำลังยกเลิก…'
                  : confirmingCancel
                    ? 'แตะอีกครั้งเพื่อยกเลิก'
                    : 'ยกเลิก'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirmingCancel(false);
                  move(action.kind);
                }}
                className="min-h-12 flex-[2] rounded-md bg-brand text-button-primary text-on-brand hover:bg-brand-hover disabled:opacity-60"
              >
                {busy && workingKind === action.kind
                  ? action.busy
                  : action.label}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => move(action.kind)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-md text-button-primary text-on-brand disabled:opacity-60 ${
                status === 'cooking'
                  ? 'bg-status-done'
                  : 'bg-brand hover:bg-brand-hover'
              }`}
            >
              {status === 'cooking' ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="5 12 10 17 19 7" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 8h12l-1 12H7z" />
                  <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                </svg>
              )}
              {busy ? action.busy : action.label}
            </button>
          )}
        </article>
      </div>
    </li>
  );
}

export default StaffOrderCard;
