import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getJson } from '../src/api.js';
import { getLinePrice } from '../src/constants/prices.js';
import {
  STATUS_FLAGS,
  STATUS_META,
  orderStatus,
} from '../src/constants/orderStatus.jsx';
import SubPageShell from '../src/components/SubPageShell.jsx';
import DeliveryFeePicker from '../src/components/DeliveryFeePicker.jsx';
import ItemBuilder from '../src/components/ItemBuilder.jsx';
import OrderItemList from '../src/components/OrderItemList.jsx';
import SectionLabel from '../src/components/SectionLabel.jsx';
import {
  inputClass,
  labelClass,
  legendClass,
} from '../src/components/formClasses.js';

// fetch only rejects (TypeError) on network failure; anything else carries
// the server's message
function errorMessage(err) {
  return err instanceof TypeError
    ? 'Cannot reach the server. Check your connection.'
    : err.message;
}

function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  // The order as loaded (null = still loading); the form fields below start
  // from it and are only sent back on "Save changes"
  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [status, setStatus] = useState('pending');
  const [statusError, setStatusError] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const [items, setItems] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // "Cancel order" needs two taps: the first only arms it (Jui, 2026-09-29) —
  // it sits right under "Save changes", so a slip of the thumb is easy
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const total =
    items.reduce((sum, item) => sum + getLinePrice(item), 0) + deliveryFee;

  // Loaded once, same as NewOrder's round list — not polled, so what you're
  // editing can't change under you
  useEffect(() => {
    let ignore = false;

    getJson(`/api/v1/orders/${id}`)
      .then(({ data }) => {
        if (ignore) return;
        const loaded = data.order;
        setOrder(loaded);
        setStatus(orderStatus(loaded));
        setItems(loaded.items);
        setDeliveryFee(loaded.deliveryFee);
        // Orders saved before these became required may not have them
        setDeliveryTime(loaded.deliveryTime ?? '');
        setCustomerName(loaded.customerName ?? '');
        setNote(loaded.note ?? '');
      })
      .catch((err) => {
        if (!ignore) setLoadError(errorMessage(err));
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  function patchOrder(body) {
    return getJson(`/api/v1/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  function backToOrders() {
    // replace: Back shouldn't return to an order that was just saved or
    // cancelled. openRoundId keeps this order's round expanded on Orders.
    navigate('/orders', { replace: true, state: { openRoundId: order.round } });
  }

  // Saved the moment it's tapped, not on "Save changes": marking an order
  // done/delivered is the most common reason to open this page, so it should
  // take one tap. Shown right away; put back if the server says no.
  async function changeStatus(next) {
    const previous = status;
    setStatus(next);
    setStatusError('');
    setIsSavingStatus(true);
    try {
      await patchOrder(STATUS_FLAGS[next]);
    } catch (err) {
      setStatus(previous);
      setStatusError(errorMessage(err));
    } finally {
      setIsSavingStatus(false);
    }
  }

  // Same checks as NewOrder: the browser handles the `required` fields first
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (hasDraft) {
      setError(
        "You picked an item but didn't tap Add to order. Add it, or tap Clear selection.",
      );
      return;
    }
    if (items.length === 0) {
      setError('An order needs at least one item. To drop it, cancel it.');
      return;
    }

    setIsSubmitting(true);
    try {
      await patchOrder({
        items,
        deliveryFee,
        deliveryTime,
        customerName,
        note,
        totalPrice: total,
      });
      backToOrders();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await patchOrder({ isCancelled: true });
      backToOrders();
    } catch (err) {
      setError(errorMessage(err));
      setConfirmingCancel(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeItemBuilder() {
    setIsAddingItem(false);
    // The builder (and whatever was picked in it) is gone, so nothing is
    // waiting to be added any more
    setHasDraft(false);
  }

  if (loadError || !order || order.isCancelled) {
    return (
      <SubPageShell title="Edit order" backTo="/orders">
        {loadError || order?.isCancelled ? (
          <div className="flex flex-col items-start gap-2">
            <p
              role="alert"
              className={`text-body-small ${loadError ? 'text-danger' : 'text-ink-muted'}`}
            >
              {loadError || 'This order was cancelled.'}
            </p>
            <Link to="/orders" className="text-body-small font-semibold text-brand">
              Back to orders
            </Link>
          </div>
        ) : (
          <p className="text-body-small text-ink-muted">Loading order…</p>
        )}
      </SubPageShell>
    );
  }

  return (
    <SubPageShell title="Edit order" backTo="/orders">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset className="min-w-0">
          <legend className={legendClass}>Status</legend>
          <div className="flex gap-2">
            {Object.entries(STATUS_META).map(([value, meta]) => {
              const isSelected = status === value;
              return (
                <span key={value} className="flex-1">
                  <input
                    type="radio"
                    id={`status-${value}`}
                    name="status"
                    checked={isSelected}
                    disabled={isSavingStatus}
                    onChange={() => changeStatus(value)}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={`status-${value}`}
                    className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-pill text-body-small peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand peer-disabled:cursor-wait ${
                      isSelected
                        ? `${meta.badgeClass} font-semibold`
                        : 'border border-border text-ink-muted'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </svg>
                    )}
                    {meta.label}
                  </label>
                </span>
              );
            })}
          </div>
          {statusError && (
            <p role="alert" className="mt-2 text-body-small text-danger">
              {statusError}
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <SectionLabel>Items in this order</SectionLabel>
          {items.length === 0 ? (
            <p className="text-body-small text-ink-muted">
              No items left — add one below.
            </p>
          ) : (
            <OrderItemList
              items={items}
              onRemove={(index) =>
                setItems(items.filter((_, i) => i !== index))
              }
            />
          )}

          {isAddingItem ? (
            <div className="mt-2 flex flex-col gap-1">
              <ItemBuilder
                onAdd={(item) => {
                  setItems([...items, item]);
                  setIsAddingItem(false);
                }}
                onDraftChange={setHasDraft}
              />
              <button
                type="button"
                onClick={closeItemBuilder}
                className="min-h-11 text-body-small text-ink-muted"
              >
                Close
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingItem(true)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-surface-peach p-3 text-button-secondary text-ink"
            >
              <svg
                width="15"
                height="15"
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
              Add another item
            </button>
          )}
        </div>

        <DeliveryFeePicker value={deliveryFee} onChange={setDeliveryFee} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-time" className={labelClass}>
            Delivery time
          </label>
          <input
            id="edit-time"
            type="time"
            required
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-customer" className={labelClass}>
            Customer
          </label>
          <input
            id="edit-customer"
            type="text"
            required
            placeholder="Name or LINE ID"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-note" className={labelClass}>
            Note (optional)
          </label>
          <textarea
            id="edit-note"
            rows={2}
            placeholder="Delivery address, allergy notes, etc."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} resize-y py-2.5`}
          />
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="font-heading text-heading">
              ฿{total.toLocaleString()}
            </span>
          </div>

          {error && (
            <p role="alert" className="text-body-small text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1.5 min-h-12 rounded-md bg-brand text-button-primary text-on-brand hover:bg-brand-hover active:bg-brand-hover disabled:opacity-60"
          >
            {isSubmitting && !confirmingCancel ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCancel}
            aria-live="polite"
            className={`min-h-11 rounded-md border p-3 text-button-secondary disabled:opacity-60 ${
              confirmingCancel
                ? 'border-danger bg-danger text-on-brand'
                : 'border-danger-border text-danger'
            }`}
          >
            {confirmingCancel
              ? 'Tap again to cancel this order'
              : 'Cancel order'}
          </button>
        </div>
      </form>
    </SubPageShell>
  );
}

export default EditOrder;
