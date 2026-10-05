import { Link } from 'react-router';
import { getJson } from '../src/api.js';
import { usePolling } from '../src/hooks/usePolling.js';
import { formatLoggedAt } from '../src/constants/stock.js';
import AppShell from '../src/components/AppShell.jsx';
import SectionLabel from '../src/components/SectionLabel.jsx';
import StatCard from '../src/components/StatCard.jsx';

// The all-time totals plus the 20 newest expenses, fetched together.
// Module-level so usePolling gets the same function every render.
async function loadFinances() {
  const [summary, list] = await Promise.all([
    getJson('/api/v1/finances/summary'),
    getJson('/api/v1/expenses'),
  ]);
  return { summary: summary.data, expenses: list.data.expenses };
}

// "-฿518" rather than "฿-518" — only Profit can go below zero
function formatBaht(amount) {
  return `${amount < 0 ? '-' : ''}฿${Math.abs(amount).toLocaleString()}`;
}

// Divider under every row but the last
const dividerClass = 'not-last:border-b not-last:border-divider not-last:pb-2.5';

function Finances() {
  // Polled every 7s like Stock, so an expense added on the other phone shows up
  const { data, error, retry } = usePolling(loadFinances);

  // The cards are all-time totals, not this month's as in the design (Jui,
  // 2026-10-05): all three use the same range, so Profit is real
  return (
    <AppShell subtitle="Finances · All time">
      <div className="flex flex-col gap-4">
        {error ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-small text-danger">
              {error}
            </p>
            <button
              type="button"
              onClick={retry}
              className="min-h-11 rounded-md bg-surface-peach px-4 text-button-secondary text-ink"
            >
              Try again
            </button>
          </div>
        ) : data === null ? (
          <p className="text-body-small text-ink-muted">Loading finances…</p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard label="Revenue" value={formatBaht(data.summary.revenue)} />
            <StatCard
              label="Expenses"
              value={formatBaht(data.summary.expenses)}
            />
            {/* Red when it's a loss (Jui, 2026-10-05) — the design only
                shows the green of a profit */}
            <StatCard
              label="Profit"
              value={formatBaht(data.summary.profit)}
              valueClassName={
                data.summary.profit < 0 ? 'text-danger' : 'text-status-done'
              }
            />
          </div>
        )}

        {/* Outside the loading/error states, like Stock's Restock button: an
            expense can be added before (or without) the totals loading */}
        <Link
          to="/expenses/new"
          className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand p-3 text-button-secondary text-on-brand hover:bg-brand-hover active:bg-brand-hover"
        >
          <svg
            width="16"
            height="16"
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
          Add expense
        </Link>

        {data !== null && (
          <div className="flex flex-col gap-2">
            {/* The 20 newest of any month (Jui, 2026-10-05) — so once there
                are more, they won't add up to the Expenses card */}
            <SectionLabel>Recent expenses</SectionLabel>
            {data.expenses.length === 0 ? (
              <p className="text-body-small text-ink-muted">No expenses yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-md bg-surface-raised px-4 py-3.5 shadow-sm">
                {data.expenses.map((expense) => (
                  <Link
                    key={expense._id}
                    to={`/expenses/${expense._id}`}
                    className={`flex flex-col gap-0.5 ${dividerClass}`}
                  >
                    <span className="text-body">
                      {expense.title} · {formatBaht(expense.amount)}
                    </span>
                    <span className="text-label text-ink-muted">
                      {formatLoggedAt(expense.createdAt)} ·{' '}
                      {expense.staffMember}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default Finances;
