import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import {
  AFFECTED_BY,
  LOAD_ONCE,
  orderQuery,
  refreshAfterSave,
} from '../src/queries.js';
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

// Loads the order, then hands it to the form (see EditExpense for why it's
// split in two)
function EditOrder() {
  const { id } = useParams();
  // Loaded once, same as NewOrder's round list — not polled, so what you're
  // editing can't change under you
  const { data: order, error } = useQuery({ ...orderQuery(id), ...LOAD_ONCE });

  if (!order || order.isCancelled) {
    return (
      <SubPageShell title="Edit order" backTo="/orders">
        {error || order?.isCancelled ? (
          <div className="flex flex-col items-start gap-2">
            <p
              role="alert"
              className={`text-body-small ${error ? 'text-danger' : 'text-ink-muted'}`}
            >
              {error ? errorMessage(error) : 'This order was cancelled.'}
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

  return <EditOrderForm order={order} />;
}

// order: as loaded; the fields below start from it and are only sent back on
// "Save changes"
function EditOrderForm({ order }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const url = `/api/v1/orders/${order._id}`;

  const [status, setStatus] = useState(() => orderStatus(order));
  const [statusError, setStatusError] = useState('');

  const [items, setItems] = useState(order.items);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryFee);
  // Orders saved before these became required may not have them
  const [deliveryTime, setDeliveryTime] = useState(order.deliveryTime ?? '');
  const [customerName, setCustomerName] = useState(order.customerName ?? '');
  const [note, setNote] = useState(order.note ?? '');

  const [error, setError] = useState('');
  // "Cancel order" needs two taps: the first only arms it (Jui, 2026-09-29) —
  // it sits right under "Save changes", so a slip of the thumb is easy
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const total =
    items.reduce((sum, item) => sum + getLinePrice(item), 0) + deliveryFee;

  function patchOrder(body) {
    return getJson(url, { method: 'PATCH', body: JSON.stringify(body) });
  }

  function backToOrders() {
    // replace: Back shouldn't return to an order that was just saved or
    // cancelled. openRoundId keeps this order's round expanded on Orders.
    navigate('/orders', { replace: true, state: { openRoundId: order.round } });
  }

  // Saved the moment it's tapped, not on "Save changes": marking an order
  // done/delivered is the most common reason to open this page, so it should
  // take one tap. Shown right away; put back if the server says no. We stay
  // on this page, so the lists are refreshed without waiting.
  const statusSave = useMutation({
    mutationFn: (next) => patchOrder(STATUS_FLAGS[next]),
    onMutate: (next) => {
      const previous = status;
      setStatus(next);
      setStatusError('');
      return { previous };
    },
    onError: (err, _next, context) => {
      setStatus(context.previous);
      setStatusError(errorMessage(err));
    },
    onSuccess: () => refreshAfterSave(queryClient, AFFECTED_BY.order),
  });

  // Save and Cancel both wait for Orders (and the stock and finances lists,
  // since items decide stock and revenue) to be refetched before leaving
  const save = useMutation({
    mutationFn: async (body) => {
      await patchOrder(body);
      await refreshAfterSave(queryClient, AFFECTED_BY.order);
    },
    onSuccess: backToOrders,
    onError: (err) => setError(errorMessage(err)),
  });
  const cancel = useMutation({
    mutationFn: async () => {
      await patchOrder({ isCancelled: true });
      await refreshAfterSave(queryClient, AFFECTED_BY.order);
    },
    onSuccess: backToOrders,
    onError: (err) => {
      setError(errorMessage(err));
      setConfirmingCancel(false);
    },
  });
  const isSubmitting = save.isPending || cancel.isPending;

  // Same checks as NewOrder: the browser handles the `required` fields first
  function handleSubmit(e) {
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

    save.mutate({
      items,
      deliveryFee,
      deliveryTime,
      customerName,
      note,
      totalPrice: total,
    });
  }

  function handleCancel() {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    setError('');
    cancel.mutate();
  }

  function closeItemBuilder() {
    setIsAddingItem(false);
    // The builder (and whatever was picked in it) is gone, so nothing is
    // waiting to be added any more
    setHasDraft(false);
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
                    disabled={statusSave.isPending}
                    onChange={() => statusSave.mutate(value)}
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
