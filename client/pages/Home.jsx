import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage, getJson } from '../src/api.js';
import {
  AFFECTED_BY,
  POLLED,
  activeRoundsWithEarningsQuery,
  refreshAfterSave,
  stockItemsQuery,
} from '../src/queries.js';
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

function Home() {
  const queryClient = useQueryClient();

  // Separate from the rounds, so a failed stock load shows its own error and
  // "Try again" instead of taking the Active rounds section down too. Same
  // cache entry as the Stock page; `select` picks up to 5 items, Out and Low
  // first (see pickPreviewItems).
  const stockQuery = useQuery({
    ...stockItemsQuery,
    ...POLLED,
    select: pickPreviewItems,
  });
  const stockItems = stockQuery.data ?? null;
  const stockError =
    !stockItems && stockQuery.error ? errorMessage(stockQuery.error) : '';

  // Every active round with its earnings
  const roundsQuery = useQuery({ ...activeRoundsWithEarningsQuery, ...POLLED });
  const rounds = roundsQuery.data ?? null;
  // Only before the first load: a refresh that fails later keeps the last
  // data on screen
  const error =
    !rounds && roundsQuery.error ? errorMessage(roundsQuery.error) : '';

  // No confirmation step before closing a round (matches the design, and
  // Jui confirmed it stays that way) — a swipe + tap ends it right away.
  const endRound = useMutation({
    mutationFn: (id) => getJson(`/api/v1/rounds/${id}`, { method: 'PATCH' }),
    onSuccess: ({ data }) => {
      // Drop the row at once, then let the lists catch up (Orders shows
      // ended rounds without the green dot)
      queryClient.setQueryData(activeRoundsWithEarningsQuery.queryKey, (old) =>
        old?.filter((r) => r._id !== data.round._id),
      );
      refreshAfterSave(queryClient, AFFECTED_BY.round);
    },
  });
  // Separate from `error`: a failed "End round" shouldn't replace the whole
  // rounds list with the full-page error state used for the initial load.
  // The row is left as-is (still swiped open) so the operator can just tap
  // "End round" again — no separate retry button needed here.
  const endRoundError = endRound.error ? errorMessage(endRound.error) : '';

  return (
    <AppShell subtitle={formatToday()} showLogout>
      <div className="flex flex-col gap-6">
        {error ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-small text-danger">
              {error}
            </p>
            <button
              type="button"
              onClick={() => roundsQuery.refetch()}
              className="min-h-11 rounded-md bg-surface-peach px-4 text-button-secondary text-ink"
            >
              Try again
            </button>
          </div>
        ) : rounds === null ? (
          <p className="text-body-small text-ink-muted">Loading rounds…</p>
        ) : (
          <div className="flex flex-col gap-2">
            <ActiveRounds rounds={rounds} onEnd={endRound.mutate} />
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
          onRetry={() => stockQuery.refetch()}
        />
      </div>
    </AppShell>
  );
}

export default Home;
