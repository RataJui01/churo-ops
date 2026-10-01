import { formatAmount, stockLevel } from '../constants/stock.js';
import StockBadge from './StockBadge.jsx';

// The right-hand side of a stock row, shared by the Stock page and Home's
// StockPreview: the plain amount, a Low badge that still shows the amount
// (as in the design), or an Out badge. "Out" instead of a number because
// once orders deduct stock the count can go below zero, and "-3 pcs" reads
// worse than "Out".
function StockLevel({ item }) {
  const level = stockLevel(item);

  if (level === 'out') return <StockBadge level="out">Out</StockBadge>;
  if (level === 'low') {
    return (
      <StockBadge level="low">{formatAmount(item.quantity, item.unit)}</StockBadge>
    );
  }
  return (
    <span className="shrink-0 text-body-small font-normal text-ink-muted">
      {formatAmount(item.quantity, item.unit)}
    </span>
  );
}

export default StockLevel;
