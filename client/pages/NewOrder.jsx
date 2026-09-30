import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getJson } from '../src/api.js';
import { getLinePrice } from '../src/constants/prices.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import ItemBuilder from '../src/components/ItemBuilder.jsx';
import OrderItemList from '../src/components/OrderItemList.jsx';
import SectionLabel from '../src/components/SectionLabel.jsx';
import DeliveryFeePicker from '../src/components/DeliveryFeePicker.jsx';
import { inputClass, labelClass } from '../src/components/formClasses.js';

// "Friday batch · 26 Sep" — round names can repeat, the delivery date tells
// them apart
function roundLabel(round) {
  const date = new Date(round.deliveryDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `${round.name} · ${date}`;
}

function NewOrder() {
  const navigate = useNavigate();
  // The order's lines; ItemBuilder hands each finished one over through onAdd
  const [items, setItems] = useState([]);
  // True while ItemBuilder has a flavor picked that hasn't been added yet
  const [hasDraft, setHasDraft] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [round, setRound] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  // No "Added by" field: the server takes staffMember from the logged-in account

  // null = still loading
  const [activeRounds, setActiveRounds] = useState(null);
  const [roundsError, setRoundsError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived on every render instead of kept in state: state would have to be
  // updated by hand every time items or the fee change, and could drift
  const subtotal = items.reduce((sum, item) => sum + getLinePrice(item), 0);
  const total = subtotal + deliveryFee;

  // Loaded once, not polled like Home/Orders: options changing under you
  // mid-form could land the order in the wrong round. If the other phone ends
  // the chosen round meanwhile, the server rejects the order with "This round
  // has already ended" instead.
  useEffect(() => {
    let ignore = false;

    getJson('/api/v1/rounds/active')
      .then(({ data }) => {
        if (ignore) return;
        setActiveRounds(data.activeRounds);
        // Only one open round = nothing to choose, so pick it; with several,
        // make the operator choose rather than guess
        if (data.activeRounds.length === 1) {
          setRound(data.activeRounds[0]._id);
        }
      })
      .catch((err) => {
        if (ignore) return;
        // fetch only rejects (TypeError) on network failure
        setRoundsError(
          err instanceof TypeError
            ? 'Cannot reach the server. Check your connection.'
            : err.message,
        );
      });

    // Stops a late response from setting state after leaving the page
    return () => {
      ignore = true;
    };
  }, []);

  // Only runs once the browser's own checks pass (the `required` round,
  // delivery time and customer fields); the item checks can't be expressed
  // as HTML attributes, so they live here.
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
      setError('Add at least one item before placing the order.');
      return;
    }

    setIsSubmitting(true);
    try {
      // No staffMember: the server sets it from the logged-in account
      await getJson('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          round,
          items,
          deliveryFee,
          deliveryTime,
          customerName,
          note,
          totalPrice: total,
        }),
      });
      // replace: Back shouldn't return to a form that's already been sent.
      // openRoundId makes Orders start with this order's round expanded.
      navigate('/orders', { replace: true, state: { openRoundId: round } });
    } catch (err) {
      // fetch only rejects (TypeError) on network failure; anything else is
      // the server's message, e.g. "This round has already ended"
      setError(
        err instanceof TypeError
          ? 'Cannot reach the server. Check your connection.'
          : err.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SubPageShell title="New order" backTo="/">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <ItemBuilder
          onAdd={(item) => setItems([...items, item])}
          onDraftChange={setHasDraft}
        />

        <div className="flex flex-col gap-2">
          <SectionLabel>Items in this order ({items.length})</SectionLabel>
          {items.length === 0 ? (
            <p className="text-body-small text-ink-muted">
              No items yet — pick a flavor above and tap Add to order.
            </p>
          ) : (
            <OrderItemList
              items={items}
              onRemove={(index) =>
                setItems(items.filter((_, i) => i !== index))
              }
            />
          )}
        </div>

        <DeliveryFeePicker value={deliveryFee} onChange={setDeliveryFee} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-round" className={labelClass}>
            Round
          </label>
          {activeRounds?.length === 0 ? (
            <p className="text-body-small text-ink-muted">
              No active round.{' '}
              <Link to="/rounds/new" className="font-semibold text-brand">
                Start a new round
              </Link>
            </p>
          ) : (
            <select
              id="order-round"
              required
              disabled={activeRounds === null}
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className={inputClass}
            >
              {activeRounds === null ? (
                <option value="">
                  {roundsError ? 'Could not load rounds' : 'Loading rounds…'}
                </option>
              ) : (
                <>
                  {activeRounds.length > 1 && (
                    <option value="">Choose a round</option>
                  )}
                  {activeRounds.map((r) => (
                    <option key={r._id} value={r._id}>
                      {roundLabel(r)}
                    </option>
                  ))}
                </>
              )}
            </select>
          )}
          {roundsError && (
            <p role="alert" className="text-body-small text-danger">
              {roundsError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-time" className={labelClass}>
            Delivery time
          </label>
          <input
            id="order-time"
            type="time"
            required
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-customer" className={labelClass}>
            Customer
          </label>
          <input
            id="order-customer"
            type="text"
            required
            placeholder="Name or LINE ID"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-note" className={labelClass}>
            Note (optional)
          </label>
          <textarea
            id="order-note"
            rows={2}
            placeholder="Delivery address, allergy notes, etc."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} resize-y py-2.5`}
          />
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-body font-normal text-ink-muted">
              Subtotal
            </span>
            <span className="text-body font-normal">
              ฿{subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body font-normal text-ink-muted">
              Delivery
            </span>
            <span className="text-body font-normal">
              {deliveryFee === 0 ? 'Free' : `฿${deliveryFee}`}
            </span>
          </div>
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
            {isSubmitting ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </form>
    </SubPageShell>
  );
}

export default NewOrder;
