import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import {
  UNITS,
  findItemByName,
  formatAmount,
  stockLevel,
} from '../src/constants/stock.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import {
  inputClass,
  labelClass,
  legendClass,
} from '../src/components/formClasses.js';

// The end of the design's threshold help text, worked out from the form's
// current numbers
const LEVEL_TEXT = {
  low: "so it's flagged Low",
  out: 'so it shows as Out',
  ok: "so it isn't flagged",
};

function EditStockItem() {
  const { id } = useParams();
  const navigate = useNavigate();

  // The item as loaded (null = still loading) — also what "changed" is
  // measured against on Save — and every other item, for the name check
  const [item, setItem] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  // Number inputs are kept as strings and converted when used
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [perPiece, setPerPiece] = useState('');
  const [perOrder, setPerOrder] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Two taps, like the app's other delete buttons (Jui, 2026-10-03)
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Loaded once, not polled, so what's being edited can't change underfoot
  useEffect(() => {
    let ignore = false;

    Promise.all([
      getJson(`/api/v1/stock-items/${id}`),
      getJson('/api/v1/stock-items'),
    ])
      .then(([one, all]) => {
        if (ignore) return;
        const loaded = one.data.stockItem;
        setItem(loaded);
        setStockItems(all.data.stockItems);
        setName(loaded.name);
        setUnit(loaded.unit);
        setQuantity(String(loaded.quantity));
        setThreshold(String(loaded.lowStockThreshold));
        setPerPiece(String(loaded.usedPerPiece));
        setPerOrder(String(loaded.usedPerOrder));
      })
      .catch((err) => {
        if (!ignore) setLoadError(errorMessage(err));
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  // Names must stay unique: flag a clash with any *other* item while typing.
  // A deleted item's name isn't in the list — the server explains that one.
  const clash = findItemByName(stockItems, name);
  const isDuplicate = clash !== null && clash._id !== item?._id;
  const unitChanged = item !== null && unit !== item.unit;
  const level = stockLevel({
    quantity: Number(quantity),
    lowStockThreshold: Number(threshold),
  });

  // Only what was actually changed. Sending every field would write the
  // loaded quantity back on each save — wiping out a restock the other phone
  // made while this page was open, even when only the threshold was edited.
  function changedFields() {
    const changes = {};
    if (name.trim() !== item.name) changes.name = name;
    if (unit !== item.unit) changes.unit = unit;
    const numbers = {
      quantity,
      lowStockThreshold: threshold,
      usedPerPiece: perPiece,
      usedPerOrder: perOrder,
    };
    Object.entries(numbers).forEach(([field, value]) => {
      if (Number(value) !== item[field]) changes[field] = Number(value);
    });
    return changes;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isDuplicate) return;
    setError('');

    const changes = changedFields();
    if (Object.keys(changes).length === 0) {
      navigate('/stock', { replace: true });
      return;
    }

    setIsSubmitting(true);
    try {
      await getJson(`/api/v1/stock-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      // replace: Back shouldn't return to an item that was just saved
      navigate('/stock', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await getJson(`/api/v1/stock-items/${id}`, { method: 'DELETE' });
      navigate('/stock', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setConfirmingDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading, failed, or already deleted: no form
  if (loadError || !item || item.isDeleted) {
    const message = loadError || (item && 'This item was deleted.');
    return (
      <SubPageShell title="Edit stock item" backTo="/stock">
        {message ? (
          <div className="flex flex-col items-start gap-2">
            <p
              role="alert"
              className={`text-body-small ${loadError ? 'text-danger' : 'text-ink-muted'}`}
            >
              {message}
            </p>
            <Link
              to="/stock"
              className="text-body-small font-semibold text-brand"
            >
              Back to stock
            </Link>
          </div>
        ) : (
          <p className="text-body-small text-ink-muted">Loading item…</p>
        )}
      </SubPageShell>
    );
  }

  return (
    <SubPageShell title="Edit stock item" backTo="/stock">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-name" className={labelClass}>
            Item name
          </label>
          <input
            id="item-name"
            type="text"
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={isDuplicate}
            className={inputClass}
          />
          {isDuplicate && (
            <p role="alert" className="text-label text-danger">
              There's already an item called {clash.name}.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-unit" className={labelClass}>
            Unit
          </label>
          <select
            id="item-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={inputClass}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {/* Allowed with a warning (Jui, 2026-10-03): the numbers don't
              convert, they're just read in the new unit. Past restock-log
              entries keep their own unit. */}
          {unitChanged && (
            <p className="text-label text-status-pending">
              The {Number(quantity).toLocaleString()} in stock and the alert
              number will now be read as {unit} — check them below.
            </p>
          )}
        </div>

        {/* Not in the design: the one place to set the count to what was
            actually counted, or to take off things orders don't deduct */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-quantity" className={labelClass}>
            In stock now
          </label>
          <input
            id="item-quantity"
            type="number"
            inputMode="decimal"
            step="any"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
          />
          <p className="text-label text-ink-muted">
            Set this to what you actually counted. It isn't logged as a
            restock.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-threshold" className={labelClass}>
            Low-stock alert below
          </label>
          <input
            id="item-threshold"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className={inputClass}
          />
          <p aria-live="polite" className="text-label text-ink-muted">
            This item shows as Low on the Stock page whenever its quantity
            drops below this number, in the unit above. Currently{' '}
            {formatAmount(Number(quantity), unit)}, {LEVEL_TEXT[level]}.
          </p>
        </div>

        {/* Not in the design: the auto-deduction rules, kept as data on each
            item (decided 2026-09-30) */}
        <fieldset className="min-w-0">
          <legend className={legendClass}>Auto-deduct on each order</legend>
          <div className="flex gap-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor="item-per-piece" className="text-label text-ink-muted">
                Per churro piece
              </label>
              <input
                id="item-per-piece"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                required
                value={perPiece}
                onChange={(e) => setPerPiece(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor="item-per-order" className="text-label text-ink-muted">
                Per order
              </label>
              <input
                id="item-per-order"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                required
                value={perOrder}
                onChange={(e) => setPerOrder(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <p className="mt-1.5 text-label text-ink-muted">
            Each order takes per churro piece × its churro pieces, plus per
            order. Leave both at 0 for things that are hard to count.
          </p>
          {/* Remove once orders deduct stock (todo.TODO) — without it the
              numbers seem to do nothing */}
          <p className="text-label text-status-pending">
            Orders don't deduct stock yet.
          </p>
        </fieldset>

        <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
          {error && (
            <p role="alert" className="text-body-small text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isDuplicate}
            className="min-h-12 rounded-md bg-brand text-button-primary text-on-brand hover:bg-brand-hover active:bg-brand-hover disabled:opacity-60"
          >
            {isSubmitting && !confirmingDelete ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleDelete}
            aria-live="polite"
            className={`min-h-11 rounded-md border p-3 text-button-secondary disabled:opacity-60 ${
              confirmingDelete
                ? 'border-danger bg-danger text-on-brand'
                : 'border-danger-border text-danger'
            }`}
          >
            {confirmingDelete ? 'Tap again to delete this item' : 'Delete item'}
          </button>
        </div>
      </form>
    </SubPageShell>
  );
}

export default EditStockItem;
