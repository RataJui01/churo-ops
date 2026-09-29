import { formatExtras, formatItemName } from '../constants/flavors.js';
import { getLinePrice } from '../constants/prices.js';

// The "Items in this order" card, shared by NewOrder and (later) EditOrder.
// Just the card: each page renders its own heading and empty state.
function OrderItemList({ items, onRemove }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-md bg-surface-raised px-3.5 py-3 shadow-sm">
      {/* index as key: unsaved items have no _id yet, and a row keeps no state
          or inputs of its own, so React reusing a row's DOM after a removal
          can't leave a value on the wrong line */}
      {items.map((item, i) => {
        const extrasLine = formatExtras(item);
        return (
          <div
            key={i}
            className={`flex items-center justify-between gap-2.5 ${
              i === items.length - 1 ? '' : 'border-b border-divider pb-2.5'
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-body">{formatItemName(item)}</span>
              {extrasLine && (
                <span className="text-label text-ink-muted">{extrasLine}</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="text-body-small text-ink-muted">
                ฿{getLinePrice(item).toLocaleString()}
              </span>
              {/* 28px circle per the design inside a 44px tap area; -m-2 takes
                  the extra 8px back on each side so the layout doesn't move.
                  type="button": this sits inside the page's <form> */}
              <button
                type="button"
                aria-label={`Remove ${formatItemName(item)}`}
                onClick={() => onRemove(i)}
                className="-m-2 flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-pink text-danger">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default OrderItemList;
