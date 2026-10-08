import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import {
  AFFECTED_BY,
  FORM_LIST,
  refreshAfterSave,
  stockItemsWithDeletedQuery,
} from '../src/queries.js';
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
  const queryClient = useQueryClient();

  // For the name suggestions and the unit lock: shown from the cache at
  // once, not polled or refetched on focus mid-form. Deleted items come too,
  // only so their names can be recognised below.
  const itemsQuery = useQuery({ ...stockItemsWithDeletedQuery, ...FORM_LIST });
  // null = still loading
  const stockItems = itemsQuery.data ?? null;
  // The form still works without the list; the server checks units anyway
  const loadError = !stockItems && itemsQuery.isError;

  // Derived on every render: typing an existing name locks the unit to that
  // item's own (decision 1b); typing on to a new name gives back whatever unit
  // was picked by hand
  const activeItems = stockItems?.filter((item) => !item.isDeleted) ?? [];
  const match = findItemByName(activeItems, name);
  // A deleted item's name: the server brings that same item back
  // (restockController.bringBack) instead of starting a new one
  const deletedMatch = match
    ? null
    : findItemByName(stockItems?.filter((item) => item.isDeleted) ?? [], name);
  // A deleted item comes back in whatever unit is picked here (its count
  // restarts at 0, so no old number can be misread), so the select stays open
  const shownUnit = match ? match.unit : unit;

  // Says which of the three things will happen, so a small typo doesn't
  // silently start a second item (Jui, 2026-10-01)
  let helpText =
    'Type an existing item to top it up, or a new name to start tracking it.';
  if (match) {
    helpText = `Topping up ${match.name} — ${formatAmount(match.quantity, match.unit)} in stock now.`;
  } else if (deletedMatch) {
    // Its threshold and auto-deduct rules are kept, so say so — a "new"
    // Box would otherwise start being taken by orders without warning
    helpText = `${deletedMatch.name} was deleted earlier — this brings it back, starting from 0. Its low-stock alert and auto-deduct settings come back too.`;
  } else if (name.trim() && stockItems) {
    helpText = 'New item — it will start being tracked.';
  }

  // Waits for Stock's lists to be refetched, so the restock is there on
  // arrival
  const addRestock = useMutation({
    mutationFn: async (restock) => {
      await getJson('/api/v1/restocks', {
        method: 'POST',
        body: JSON.stringify(restock),
      });
      await refreshAfterSave(queryClient, AFFECTED_BY.restock);
    },
    // replace: Back shouldn't return to a form that was already sent
    onSuccess: () => navigate('/stock', { replace: true }),
    onError: (err) => setError(errorMessage(err)),
  });
  const isSubmitting = addRestock.isPending;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    addRestock.mutate({ name, quantity: Number(quantity), unit: shownUnit });
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
            {activeItems.map((item) => (
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
