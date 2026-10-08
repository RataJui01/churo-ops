import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { errorMessage } from '../src/api.js';
import {
  POLLED,
  restocksQuery,
  stockItemsQuery,
} from '../src/queries.js';
import {
  formatAmount,
  formatLoggedAt,
  stockLevel,
} from '../src/constants/stock.js';
import AppShell from '../src/components/AppShell.jsx';
import SectionLabel from '../src/components/SectionLabel.jsx';
import StockLevel from '../src/components/StockLevel.jsx';

// Divider under every row but the last
const dividerClass = 'not-last:border-b not-last:border-divider not-last:pb-2.5';

function Stock() {
  // Polled every 7s like Orders, so a restock on the other phone shows up
  // here. Two queries rather than one: the item list is the same cache entry
  // Home uses, so going between Home and Stock shows it at once.
  const items = useQuery({ ...stockItemsQuery, ...POLLED });
  const log = useQuery({ ...restocksQuery, ...POLLED });

  const data =
    items.data && log.data
      ? { stockItems: items.data, restocks: log.data }
      : null;
  // Only before the first load: a refresh that fails later keeps the last
  // data on screen
  const failed = (!items.data && items.error) || (!log.data && log.error);
  const error = failed ? errorMessage(failed) : '';
  function retry() {
    items.refetch();
    log.refetch();
  }

  // "low" in the subtitle counts Out items too — both need restocking
  const needRestock =
    data?.stockItems.filter((item) => stockLevel(item) !== 'ok').length ?? 0;
  const subtitle =
    data === null
      ? 'Stock'
      : `Stock · ${data.stockItems.length} item${data.stockItems.length === 1 ? '' : 's'}, ${needRestock} low`;

  return (
    <AppShell subtitle={subtitle}>
      <div className="flex flex-col gap-4">
        <Link
          to="/restock"
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
          Restock
        </Link>

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
          <p className="text-body-small text-ink-muted">Loading stock…</p>
        ) : (
          <>
            {data.stockItems.length === 0 ? (
              <p className="text-body-small text-ink-muted">
                No stock items yet — tap Restock to start tracking one.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-md bg-surface-raised px-4 py-3.5 shadow-sm">
                {data.stockItems.map((item) => (
                  <Link
                    key={item._id}
                    to={`/stock/${item._id}`}
                    className={`flex items-center justify-between gap-3 ${dividerClass}`}
                  >
                    <span className="min-w-0 text-body">{item.name}</span>
                    <StockLevel item={item} />
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <SectionLabel>Restock log</SectionLabel>
              {data.restocks.length === 0 ? (
                <p className="text-body-small text-ink-muted">
                  No restocks yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5 rounded-md bg-surface-raised px-4 py-3.5 shadow-sm">
                  {data.restocks.map((restock) => (
                    <Link
                      key={restock._id}
                      to={`/restocks/${restock._id}`}
                      className={`flex flex-col gap-0.5 ${dividerClass}`}
                    >
                      <span className="text-body">
                        {/* Deleting an item only hides it (Jui, 2026-10-03),
                            so its entries keep the real name — the log is a
                            record of what was bought. ?? is just a guard. */}
                        {restock.stockItem?.name ?? 'Deleted item'}{' '}
                        {restock.stockItem?.isDeleted && (
                          <span className="text-label text-ink-muted">
                            (deleted){' '}
                          </span>
                        )}
                        <span className="text-status-done">
                          +{formatAmount(restock.quantity, restock.unit)}
                        </span>
                      </span>
                      <span className="text-label text-ink-muted">
                        {formatLoggedAt(restock.createdAt)} ·{' '}
                        {restock.staffMember}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default Stock;
