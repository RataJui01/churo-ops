import { Link } from 'react-router';
import SectionLabel from './SectionLabel.jsx';
import StockLevel from './StockLevel.jsx';

// Home's "Stock levels" card. items: the stock items to show, already picked
// and ordered by Home (null = still loading). Rows aren't links, as in the
// design — "See all" opens the Stock page.
function StockPreview({ items, error, onRetry }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Stock levels</SectionLabel>
        <Link to="/stock" className="text-body-small text-brand">
          See all
        </Link>
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-body-small text-danger">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-md bg-surface-peach px-4 text-button-secondary text-ink"
          >
            Try again
          </button>
        </div>
      ) : items === null ? (
        <p className="text-body-small text-ink-muted">Loading stock…</p>
      ) : items.length === 0 ? (
        <p className="text-body-small text-ink-muted">No stock items yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-md bg-surface-raised px-4 py-3.5 shadow-sm">
          {items.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between gap-3 not-last:border-b not-last:border-divider not-last:pb-2.5"
            >
              <div className="min-w-0 text-body">{item.name}</div>
              {/* Same Out/Low rule and look as the Stock page */}
              <StockLevel item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StockPreview;
