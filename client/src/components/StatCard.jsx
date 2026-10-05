// One of the Finances page's three totals (Revenue / Expenses / Profit).
// valueClassName colors the number, e.g. green or red for Profit. min-w-0
// lets a long number shrink inside its grid column instead of widening it.
function StatCard({ label, value, valueClassName = 'text-ink' }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-surface-raised px-2.5 py-3 shadow-sm">
      <div className="text-caption text-ink-muted">{label}</div>
      <div className={`font-heading text-display-compact ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

export default StatCard;
