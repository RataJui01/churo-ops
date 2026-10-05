import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import {
  UNITS,
  findItemByName,
  formatLoggedAt,
} from '../src/constants/stock.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import { inputClass, labelClass } from '../src/components/formClasses.js';

function EditRestock() {
  const { id } = useParams();
  const navigate = useNavigate();

  // The entry as loaded (null = still loading) and every item, for the name
  // suggestions and to tell an existing item from a new one while typing
  const [restock, setRestock] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  // Deleted items, only to recognise their names: moving an entry onto one
  // brings that item back (findOrCreateItem → bringBack on the server)
  const [deletedItems, setDeletedItems] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // "Delete entry" needs two taps, like Cancel order (Jui, 2026-10-01)
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Loaded once, not polled, so what's being edited can't change underfoot
  useEffect(() => {
    let ignore = false;

    Promise.all([
      getJson(`/api/v1/restocks/${id}`),
      // Deleted items too, to tell a move onto one apart from a new item
      getJson('/api/v1/stock-items?includeDeleted=true'),
    ])
      .then(([entry, items]) => {
        if (ignore) return;
        const loaded = entry.data.restock;
        setRestock(loaded);
        setStockItems(items.data.stockItems.filter((item) => !item.isDeleted));
        setDeletedItems(items.data.stockItems.filter((item) => item.isDeleted));
        setName(loaded.stockItem?.name ?? '');
        setQuantity(String(loaded.quantity));
      })
      .catch((err) => {
        if (!ignore) setLoadError(errorMessage(err));
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  // The name says which item this restock belongs to: changing it MOVES the
  // entry to that item (or to a new one), it never renames an item
  // (Jui, 2026-10-01). Derived each render, like the Restock form.
  const currentItem = restock?.stockItem ?? null;
  // The entry's own item is added to the search because it's missing from
  // stockItems when it was deleted — otherwise its unchanged name would read
  // as a move to a "new item"
  const target = findItemByName(
    currentItem ? [currentItem, ...stockItems] : stockItems,
    name,
  ); // null = new, deleted or empty name
  // Coming back in the entry's own unit, counting from 0 — so like a new
  // item it needs no unit warning
  const revived = target ? null : findItemByName(deletedItems, name);
  const isMove =
    name.trim() !== '' && (target === null || target._id !== currentItem?._id);
  // The entry always takes its item's unit; a new item starts in the entry's
  const shownUnit = target ? target.unit : (restock?.unit ?? '');
  const unitChanges = isMove && shownUnit !== restock?.unit;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await getJson(`/api/v1/restocks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, quantity: Number(quantity) }),
      });
      // replace: Back shouldn't return to an entry that was just saved
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
      await getJson(`/api/v1/restocks/${id}`, { method: 'DELETE' });
      navigate('/stock', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setConfirmingDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading, failed, or an entry whose item no longer exists: no form
  if (loadError || !restock || !restock.stockItem) {
    const message = loadError || (restock && "This entry's item was deleted.");
    return (
      <SubPageShell title="Edit restock entry" backTo="/stock">
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
          <p className="text-body-small text-ink-muted">Loading entry…</p>
        )}
      </SubPageShell>
    );
  }

  return (
    <SubPageShell
      title="Edit restock entry"
      subtitle={`Logged ${formatLoggedAt(restock.createdAt)} · ${restock.staffMember}`}
      backTo="/stock"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-restock-name" className={labelClass}>
            Item name
          </label>
          <input
            id="edit-restock-name"
            type="text"
            required
            autoComplete="off"
            value={name}
            list="edit-restock-names"
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <datalist id="edit-restock-names">
            {stockItems.map((item) => (
              <option key={item._id} value={item.name} />
            ))}
          </datalist>
          {/* Not in the design: say what Save will do, since the counts of
              two items change when an entry moves */}
          <p aria-live="polite" className="text-label text-ink-muted">
            {isMove &&
              (target
                ? `Moves this restock from ${currentItem.name} to ${target.name}.`
                : revived
                  ? `Moves this restock from ${currentItem.name} to ${revived.name}, which was deleted earlier — it comes back, starting from 0.`
                  : `Moves this restock from ${currentItem.name} to a new item, ${name.trim()}.`)}
          </p>
          {unitChanges && (
            <p className="text-label text-status-pending">
              {target.name} is counted in {shownUnit} — make sure the quantity
              is in {shownUnit} too.
            </p>
          )}
        </div>

        <div className="flex gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="edit-restock-qty" className={labelClass}>
              Quantity
            </label>
            <input
              id="edit-restock-qty"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex w-28 shrink-0 flex-col gap-1.5">
            <label htmlFor="edit-restock-unit" className={labelClass}>
              Unit
            </label>
            {/* Always the unit of the item the entry belongs to (decision
                1b) — it follows the name; changing an item's own unit
                belongs on the Edit stock item page */}
            <select
              id="edit-restock-unit"
              disabled
              value={shownUnit}
              className={`${inputClass} disabled:opacity-60`}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
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
            {confirmingDelete ? 'Tap again to delete this entry' : 'Delete entry'}
          </button>
        </div>
      </form>
    </SubPageShell>
  );
}

export default EditRestock;
