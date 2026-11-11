// Shared by the storefront's staff and customer pages: how an order line is
// written, how phone numbers are shown, and how long something has waited.

// The label put in front of an item's name in carts and order cards, as the
// design writes them: "Classic · Plain (M)", "Churro Hug · Choco Pops". Bites
// and toppings have no label — their name says it all ("นมข้น").
export const CATEGORY_LABELS = {
  classic: 'Classic',
  'churro-hug': 'Churro Hug',
};

// "2× Classic · Choco Berry (S)" / "1× Churro Hug · Plain" / "1× นมข้น".
// Only Classic shows its variant: the others have a single "Regular" one,
// which isn't worth showing.
export function lineLabel(item) {
  const label = CATEGORY_LABELS[item.category];
  const name = label ? `${label} · ${item.name}` : item.name;
  const size = item.category === 'classic' ? ` (${item.variantName})` : '';
  return `${item.qty}× ${name}${size}`;
}

// "0812345678" → "081-234-5678", "021234567" → "02-123-4567"
export function formatPhone(digits) {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
}

// "โทร ••• 2281" on the awaiting-payment card: staff only need the full number
// once they might have to call (cooking / ready tabs)
export function maskPhone(digits) {
  return `••• ${digits.slice(-4)}`;
}

// Whole minutes from an ISO date to now (never below 0, in case the phone's
// clock runs a little behind the server's)
export function minutesSince(iso, now) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

// A wait in words: "8 นาที", "2 ชม.", "3 วัน". Minutes alone turn unreadable
// for an order left over from another day ("3402 นาที"). Under a minute
// returns '' so each card can say "just now" its own way.
export function durationText(minutes) {
  if (minutes < 1) return '';
  if (minutes < 60) return `${minutes} นาที`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} ชม.`;
  return `${Math.floor(minutes / (24 * 60))} วัน`;
}

// When a card turns orange (DESIGN §4.4 / §4.6): an order waiting longer than
// this for payment confirmation, or ready longer than this without pickup
export const PENDING_WARN_MIN = 5;
export const READY_WARN_MIN = 10;

// "21:30" — when the store was opened / closed
export function formatClock(iso) {
  return new Date(iso).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
