// Tailwind class strings shared by every form (NewRound, NewOrder, ItemBuilder,
// later EditOrder/Restock/...), so a style change happens in one place.

// Text, date, time and select inputs. text-base = 16px: anything smaller makes
// iOS Safari zoom in when the field is tapped.
export const inputClass =
  'min-h-11 rounded-sm border border-border bg-surface-raised px-3.5 text-base text-ink placeholder:text-ink-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

// <label> above a single input
export const labelClass =
  'text-body-small font-semibold uppercase tracking-[0.04em] text-ink-muted';

// Same look as labelClass/SectionLabel, but on a <legend> so screen readers
// announce the group ("Flavor, group")
export const legendClass = `mb-2 ${labelClass}`;

// Radio/checkbox pills: the real <input> is visually hidden (sr-only peer) and
// its <label> is what you see and tap — keyboard, arrow keys and screen readers
// keep working for free. Add the shape (rounded-pill/rounded-md) and padding.
export const optionClass =
  'flex min-h-11 cursor-pointer items-center border border-border text-body text-ink peer-checked:border-brand peer-checked:bg-brand peer-checked:font-semibold peer-checked:text-on-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand';
