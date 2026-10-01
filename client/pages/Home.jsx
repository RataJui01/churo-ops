import { useState } from 'react';
import { getJson } from '../src/api.js';
import { usePolling } from '../src/hooks/usePolling.js';
import ActiveRounds from '../src/components/ActiveRounds.jsx';
import AppShell from '../src/components/AppShell.jsx';
import QuickActions from '../src/components/QuickActions.jsx';
import StockPreview from '../src/components/StockPreview.jsx';
import { pickPreviewItems } from '../src/constants/stock.js';

// Builds "Tuesday, 16 September" (en-GB alone gives no comma)
function formatToday() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const dayMonth = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });
  return `${weekday}, ${dayMonth}`;
}

// Every active round with its earnings (sum of all its orders' totalPrice)
async function loadRounds() {
  const { data } = await getJson('/api/v1/rounds/active');

  return Promise.all(
    data.activeRounds.map(async (round) => {
      const { data } = await getJson(`/api/v1/orders?round=${round._id}`);
      const earnings = data.orders.reduce((sum, o) => sum + o.totalPrice, 0);
      return { ...round, earnings };
    }),
  );
}

// Up to 5 stock items, Out and Low first (see pickPreviewItems)
async function loadStockItems() {
  const { data } = await getJson('/api/v1/stock-items');
  return pickPreviewItems(data.stockItems);
}

function Home() {
  // Polled separately from the rounds, so a failed stock load shows its own
  // error and "Try again" instead of taking the Active rounds section down too
  const {
    data: stockItems,
    error: stockError,
    retry: retryStock,
  } = usePolling(loadStockItems);
  const {
    data: rounds,
    setData: setRounds,
    error,
    retry,
  } = usePolling(loadRounds);
  // Separate from `error`: a failed "End round" shouldn't replace the whole
  // rounds list with the full-page error state used for the initial load.
  const [endRoundError, setEndRoundError] = useState('');

  // No confirmation step before closing a round (matches the design, and
  // Jui confirmed it stays that way) — a swipe + tap ends it right away.
  async function endRound(id) {
    setEndRoundError('');
    try {
      const { data } = await getJson(`/api/v1/rounds/${id}`, {
        method: 'PATCH',
      });
      setRounds(rounds.filter((r) => r._id !== data.round._id));
    } catch (err) {
      // The row is left as-is (still swiped open) so the operator can just
      // tap "End round" again — no separate retry button needed here.
      setEndRoundError(
        err instanceof TypeError
          ? 'Cannot reach the server. Check your connection.'
          : err.message,
      );
    }
  }

  return (
    <AppShell subtitle={formatToday()}>
      <div className="flex flex-col gap-6">
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
        ) : rounds === null ? (
          <p className="text-body-small text-ink-muted">Loading rounds…</p>
        ) : (
          <div className="flex flex-col gap-2">
            <ActiveRounds rounds={rounds} onEnd={endRound} />
            {endRoundError && (
              <p role="alert" className="text-body-small text-danger">
                {endRoundError}
              </p>
            )}
          </div>
        )}
        <QuickActions />
        <StockPreview
          items={stockItems}
          error={stockError}
          onRetry={retryStock}
        />
      </div>
    </AppShell>
  );
}

export default Home;
