import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import { UNITS, findItemByName, formatAmount } from '../src/constants/stock.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import { inputClass, labelClass } from '../src/components/formClasses.js';

function Restock() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  // Kept as the input's string; converted to a number only when sending
  const [quantity, setQuantity] = useState('');
  // '' = not picked yet: a new item's unit is locked for good once it's
  // created, so it has to be a deliberate choice, not a default (Jui, 2026-10-01)
  const [unit, setUnit] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // null = still loading
  const [stockItems, setStockItems] = useState(null);
  const [loadError, setLoadError] = useState(false);

  // Loaded once for the name suggestions and the unit lock, not polled
  useEffect(() => {
    let ignore = false;

    getJson('/api/v1/stock-items')
      .then(({ data }) => {
        if (!ignore) setStockItems(data.stockItems);
      })
      .catch(() => {
        // The form still works without the list; the server checks units anyway
        if (!ignore) setLoadError(true);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Derived on every render: typing an existing name locks the unit to that
  // item's own (decision 1b); typing on to a new name gives back whatever unit
  // was picked by hand
  const match = stockItems ? findItemByName(stockItems, name) : null;
  const shownUnit = match ? match.unit : unit;

  // Says which of the two things will happen, so a small typo doesn't
  // silently start a second item (Jui, 2026-10-01)
  let helpText =
    'Type an existing item to top it up, or a new name to start tracking it.';
  if (match) {
    helpText = `Topping up ${match.name} — ${formatAmount(match.quantity, match.unit)} in stock now.`;
  } else if (name.trim() && stockItems) {
    helpText = 'New item — it will start being tracked.';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await getJson('/api/v1/restocks', {
        method: 'POST',
        body: JSON.stringify({
          name,
          quantity: Number(quantity),
          unit: shownUnit,
        }),
      });
      // replace: Back shouldn't return to a form that was already sent
      navigate('/stock', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SubPageShell title="Restock" backTo="/stock">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="restock-name" className={labelClass}>
            Item name
          </label>
          <input
            id="restock-name"
            type="text"
            list="stock-item-names"
            required
            autoComplete="off"
            placeholder="e.g. Flour"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <datalist id="stock-item-names">
            {stockItems?.map((item) => (
              <option key={item._id} value={item.name} />
            ))}
          </datalist>
          <p aria-live="polite" className="text-label text-ink-muted">
            {helpText}
          </p>
          {loadError && (
            <p className="text-label text-ink-muted">
              Couldn't load existing items — you can still restock.
            </p>
          )}
        </div>

        <div className="flex gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="restock-qty" className={labelClass}>
              Quantity
            </label>
            {/* step="any": a number input defaults to step 1, which would
                make the browser refuse 1.5 kg. The server rejects 0. */}
            <input
              id="restock-qty"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex w-28 shrink-0 flex-col gap-1.5">
            <label htmlFor="restock-unit" className={labelClass}>
              Unit
            </label>
            <select
              id="restock-unit"
              required
              disabled={!!match}
              value={shownUnit}
              onChange={(e) => setUnit(e.target.value)}
              className={`${inputClass} disabled:opacity-60`}
            >
              <option value="" disabled>
                Unit
              </option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-body-small text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-md bg-brand text-button-primary text-on-brand hover:bg-brand-hover active:bg-brand-hover disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Add restock item'}
        </button>
      </form>
    </SubPageShell>
  );
}

export default Restock;
