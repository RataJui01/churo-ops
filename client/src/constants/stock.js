// Matches server/constants/units.js
export const UNITS = ['kg', 'L', 'pcs'];

// The stock item whose name matches what was typed, or null. Same rule as the
// server's name collation (strength 2): case doesn't matter, accents do —
// localeCompare with sensitivity: 'accent' is the browser's version of that,
// so the Restock form locks the unit exactly when the server will top up
// the existing item instead of creating a new one.
export function findItemByName(items, name) {
  const wanted = name.trim();
  if (!wanted) return null;
  return (
    items.find(
      (item) =>
        item.name.localeCompare(wanted, 'en', { sensitivity: 'accent' }) === 0,
    ) ?? null
  );
}

// "1.5 kg"
export function formatAmount(quantity, unit) {
  return `${quantity.toLocaleString()} ${unit}`;
}

// The badge rule (decided 2026-09-30), kept in one place so Stock and Home
// can never disagree. At or below 0 is 'out' even when the threshold is 0 —
// the design's "Low when quantity < threshold" alone would never flag an
// empty item at threshold 0. Below 0 can happen once orders deduct stock.
export function stockLevel({ quantity, lowStockThreshold }) {
  if (quantity <= 0) return 'out';
  if (quantity < lowStockThreshold) return 'low';
  return 'ok';
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// The design's restock-log format: "Today, 9:12 AM", "Yesterday, 4:40 PM",
// or just "Sep 14" for anything older. Uses the phone's own clock and timezone.
export function formatLoggedAt(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, yesterday)) return `Yesterday, ${time}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const LEVEL_ORDER = { out: 0, low: 1, ok: 2 };

// Home's "Stock levels" preview (Jui, 2026-10-01): what needs buying first
// (Out, then Low), then the rest, at most `limit` rows — "See all" shows the
// full list. No A–Z sort needed: the server already sends items A–Z and
// Array.prototype.sort is stable, so each group keeps that order. Copies
// first because sort() changes the array in place, and this is React state.
export function pickPreviewItems(items, limit = 5) {
  return [...items]
    .sort((a, b) => LEVEL_ORDER[stockLevel(a)] - LEVEL_ORDER[stockLevel(b)])
    .slice(0, limit);
}
