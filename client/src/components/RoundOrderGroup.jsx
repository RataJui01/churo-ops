import { useState } from 'react';
import { orderStatus } from '../constants/orderStatus.jsx';
import OrderRow from './OrderRow.jsx';

const FILTERS = ['all', 'pending', 'done', 'delivered'];

// round: { _id, name, ... }; orders: that round's Order[], already fetched
// by the parent — this component doesn't fetch anything itself.
// defaultOpen only sets the starting state (e.g. the round a new order was just
// added to); after that the operator opens/closes it and polling won't reset it.
function RoundOrderGroup({ round, orders, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState('all');

  const pendingCount = orders.filter((o) => orderStatus(o) === 'pending')
    .length;
  const soldTotal = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  const visibleOrders =
    filter === 'all'
      ? orders
      : orders.filter((o) => orderStatus(o) === filter);

  return (
    <div className="overflow-hidden rounded-md bg-surface-raised shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between p-3.5 ${
          isOpen ? 'border-b border-border' : ''
        }`}
      >
        <span className="flex items-center gap-2">
          {round.isActive && (
            <span className="size-2 shrink-0 rounded-full bg-status-done" />
          )}
          <span className="text-body font-semibold">{round.name}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-label text-ink-muted">
            {orders.length} order{orders.length === 1 ? '' : 's'} ·{' '}
            {pendingCount > 0
              ? `${pendingCount} pending`
              : `฿${soldTotal.toLocaleString()} sold`}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`shrink-0 text-ink-muted transition-transform duration-150 ${
              isOpen ? '' : '-rotate-90'
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3.5">
          {pendingCount > 0 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`shrink-0 rounded-pill px-3 py-1 text-label capitalize ${
                    filter === f
                      ? 'bg-surface-peach font-semibold text-brand'
                      : 'border border-border text-ink-muted'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {visibleOrders.map((order, i) => (
              <div
                key={order._id}
                className={
                  i === visibleOrders.length - 1
                    ? undefined
                    : 'border-b border-divider pb-2.5'
                }
              >
                <OrderRow order={order} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RoundOrderGroup;
