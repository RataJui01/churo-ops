import { useId, useState } from 'react';
import { ADD_ON_LABELS, FLAVOR_LABELS } from '../constants/flavors.js';
import { ADD_ON_PRICE, getLinePrice, hasSize } from '../constants/prices.js';
import { legendClass, optionClass } from './formClasses.js';

// One object instead of five useStates, so "reset after Add" is one setDraft call
const EMPTY_DRAFT = {
  flavor: null,
  size: null,
  quantity: 1,
  addOns: [],
  separateAddOns: false,
};

const stepperClass =
  'flex size-11 items-center justify-center rounded-md border border-border bg-surface-raised text-lg font-semibold text-ink disabled:opacity-40';

// Builds one order line at a time. It doesn't keep the order's item list: the
// page using it (NewOrder now, EditOrder later) owns that and gets each finished
// item through onAdd.
// Every button is type="button" because this sits inside the page's <form> —
// a button with no type is a submit button, so +/− would place the order.
// onDraftChange(hasDraft) (optional) tells the page whether a flavor is picked
// but not added yet, so NewOrder can stop "Place order" from dropping it.
function ItemBuilder({ onAdd, onDraftChange }) {
  // Unique per ItemBuilder, so two on one page never share a radio group
  const id = useId();
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  // Size pills stay visible before a flavor is picked (no layout jump), and hide
  // only for strawberry_nutella_bite
  const showSize = !draft.flavor || hasSize(draft.flavor);
  const canAdd = draft.flavor && (!hasSize(draft.flavor) || draft.size);

  // Called right here in the event handlers rather than from a useEffect
  // watching draft: this reacts to a tap, it isn't syncing with anything
  // outside React, and an effect would cost an extra render.
  function update(field, value) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    // "Something to lose" starts once a flavor is picked
    onDraftChange?.(next.flavor !== null);
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    onDraftChange?.(false);
  }

  function toggleAddOn(addOn) {
    update(
      'addOns',
      draft.addOns.includes(addOn)
        ? draft.addOns.filter((a) => a !== addOn)
        : [...draft.addOns, addOn],
    );
  }

  function handleAdd() {
    const { flavor, size, quantity, addOns, separateAddOns } = draft;
    onAdd({
      flavor,
      quantity,
      addOns,
      separateAddOns,
      // strawberry_nutella_bite gets no size field at all, not a fake 'S'.
      // The draft keeps the old size, so switching back to another flavor
      // still has it selected.
      ...(hasSize(flavor) && { size }),
    });
    reset();
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="min-w-0">
        <legend className={legendClass}>Flavor</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(FLAVOR_LABELS).map(([value, label]) => (
            <span key={value}>
              <input
                type="radio"
                id={`${id}-flavor-${value}`}
                name={`${id}-flavor`}
                checked={draft.flavor === value}
                onChange={() => update('flavor', value)}
                className="peer sr-only"
              />
              <label
                htmlFor={`${id}-flavor-${value}`}
                className={`${optionClass} justify-center rounded-pill px-4 py-2`}
              >
                {label}
              </label>
            </span>
          ))}
        </div>
      </fieldset>

      {showSize && (
        <fieldset className="min-w-0">
          <legend className={legendClass}>Size</legend>
          <div className="flex gap-2">
            {['S', 'M'].map((size) => (
              <span key={size} className="flex-1">
                <input
                  type="radio"
                  id={`${id}-size-${size}`}
                  name={`${id}-size`}
                  checked={draft.size === size}
                  onChange={() => update('size', size)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`${id}-size-${size}`}
                  className={`${optionClass} justify-center rounded-md`}
                >
                  {size}
                </label>
              </span>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="min-w-0">
        <legend className={legendClass}>Quantity</legend>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={draft.quantity <= 1}
            onClick={() => update('quantity', draft.quantity - 1)}
            className={stepperClass}
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-6 text-center font-heading text-heading"
          >
            {draft.quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => update('quantity', draft.quantity + 1)}
            className={stepperClass}
          >
            +
          </button>
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className={legendClass}>Add-on</legend>
        <div className="flex flex-col gap-2">
          {Object.entries(ADD_ON_LABELS).map(([value, label]) => (
            <span key={value}>
              <input
                type="checkbox"
                id={`${id}-addon-${value}`}
                checked={draft.addOns.includes(value)}
                onChange={() => toggleAddOn(value)}
                className="peer sr-only"
              />
              <label
                htmlFor={`${id}-addon-${value}`}
                className={`${optionClass} justify-between gap-2.5 rounded-md px-3.5 py-2.5`}
              >
                <span>{label}</span>
                {/* opacity instead of a muted color, so it stays readable on the brand background when checked */}
                <span className="shrink-0 text-body-small opacity-80">
                  ฿{ADD_ON_PRICE}
                </span>
              </label>
            </span>
          ))}
        </div>
        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-body text-ink">
          <input
            type="checkbox"
            checked={draft.separateAddOns}
            onChange={(e) => update('separateAddOns', e.target.checked)}
            className="size-5 shrink-0 accent-brand"
          />
          Serve dip/topping separately (on the side)
        </label>
      </fieldset>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={!canAdd}
          onClick={handleAdd}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-surface-peach p-3 text-button-secondary text-ink disabled:opacity-60"
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
          {canAdd
            ? `Add to order · ฿${getLinePrice(draft).toLocaleString()}`
            : 'Add to order'}
        </button>
        {/* Not in the design: a radio can't be unticked, so once a flavor is
            picked this is the only way to back out — without it, NewOrder's
            "you didn't tap Add to order" check would block the order for good */}
        {draft.flavor && (
          <button
            type="button"
            onClick={reset}
            className="min-h-11 text-body-small text-ink-muted"
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}

export default ItemBuilder;
