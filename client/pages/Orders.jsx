import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import { errorMessage } from '../src/api.js';
import { POLLED, roundsWithOrdersQuery } from '../src/queries.js';
import AppShell from '../src/components/AppShell.jsx';
import RoundOrderGroup from '../src/components/RoundOrderGroup.jsx';

function Orders() {
  const query = useQuery({ ...roundsWithOrdersQuery, ...POLLED });
  const groups = query.data ?? null;
  // Only before the first load: a refresh that fails later keeps the last
  // data on screen
  const error = !groups && query.error ? errorMessage(query.error) : '';
  const retry = () => query.refetch();
  // Set by NewOrder after placing an order, so that round starts open and the
  // new order is visible. Router state, not ?open=: it's about this one
  // navigation, not something to bookmark or share.
  const openRoundId = useLocation().state?.openRoundId;

  const allOrders = groups?.flatMap((group) => group.orders) ?? [];
  const pendingCount = allOrders.filter(
    (o) => !o.isDone && !o.isDelivered,
  ).length;
  const subtitle =
    groups === null
      ? 'Orders'
      : `Orders · ${allOrders.length} total, ${pendingCount} pending`;

  return (
    <AppShell subtitle={subtitle}>
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
        ) : groups === null ? (
          <p className="text-body-small text-ink-muted">Loading orders…</p>
        ) : groups.length === 0 ? (
          <p className="text-body-small text-ink-muted">No orders yet</p>
        ) : (
          groups.map(({ round, orders }) => (
            <RoundOrderGroup
              key={round._id}
              round={round}
              orders={orders}
              defaultOpen={round._id === openRoundId}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

export default Orders;
