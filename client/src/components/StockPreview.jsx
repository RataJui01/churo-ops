import { Link } from 'react-router';
import LowStockBadge from './LowStockBadge.jsx';
import SectionLabel from './SectionLabel.jsx';

// items: [{ name, quantity, unit, lowStockThreshold }]
function StockPreview({ items }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Stock levels</SectionLabel>
        <Link to="/stock" className="text-body-small text-brand">
          See all
        </Link>
      </div>

      <div className="flex flex-col gap-2.5 rounded-md bg-surface-raised px-4 py-3.5 shadow-sm">
        {items.map(({ name, quantity, unit, lowStockThreshold }) => {
          const isLow = quantity < lowStockThreshold;
          return (
            <div
              key={name}
              className="flex items-center justify-between gap-3 not-last:border-b not-last:border-divider not-last:pb-2.5"
            >
              <div className="text-body">{name}</div>
              {isLow ? (
                <LowStockBadge>
                  {quantity} {unit}
                </LowStockBadge>
              ) : (
                <div className="text-body-small font-normal text-ink-muted">
                  {quantity} {unit}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StockPreview;
