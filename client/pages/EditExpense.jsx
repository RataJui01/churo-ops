import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import { formatLoggedAt } from '../src/constants/stock.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import { inputClass, labelClass } from '../src/components/formClasses.js';

function EditExpense() {
  const { id } = useParams();
  const navigate = useNavigate();

  // The expense as loaded (null = still loading) — also what "changed" is
  // measured against on Save
  const [expense, setExpense] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  // Kept as a string and converted when used, like NewExpense
  const [amount, setAmount] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Two taps, like the app's other delete buttons (Jui, 2026-10-05)
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Loaded once, not polled, so what's being edited can't change underfoot
  useEffect(() => {
    let ignore = false;

    getJson(`/api/v1/expenses/${id}`)
      .then((body) => {
        if (ignore) return;
        const loaded = body.data.expense;
        setExpense(loaded);
        setTitle(loaded.title);
        setAmount(String(loaded.amount));
      })
      .catch((err) => {
        if (!ignore) setLoadError(errorMessage(err));
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  // Only what was actually changed, like EditStockItem — so an edit made on
  // the other phone to the other field isn't written over
  function changedFields() {
    const changes = {};
    if (title.trim() !== expense.title) changes.title = title;
    if (Number(amount) !== expense.amount) changes.amount = Number(amount);
    return changes;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Same checks as NewExpense, for the same reasons
    if (!title.trim()) {
      setError('Please enter what the expense was for.');
      return;
    }
    if (!(Number(amount) > 0)) {
      setError('Amount must be more than 0.');
      return;
    }
    setError('');

    const changes = changedFields();
    if (Object.keys(changes).length === 0) {
      navigate('/finances', { replace: true });
      return;
    }

    setIsSubmitting(true);
    try {
      await getJson(`/api/v1/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      // replace: Back shouldn't return to an expense that was just saved
      navigate('/finances', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  // A real delete (Jui, 2026-10-05) — hence the two taps
  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await getJson(`/api/v1/expenses/${id}`, { method: 'DELETE' });
      navigate('/finances', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setConfirmingDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading or failed (a 404 also covers one deleted on the other phone)
  if (loadError || !expense) {
    return (
      <SubPageShell title="Edit expense" backTo="/finances">
        {loadError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-small text-danger">
              {loadError}
            </p>
            <Link
              to="/finances"
              className="text-body-small font-semibold text-brand"
            >
              Back to finances
            </Link>
          </div>
        ) : (
          <p className="text-body-small text-ink-muted">Loading expense…</p>
        )}
      </SubPageShell>
    );
  }

  return (
    <SubPageShell
      title="Edit expense"
      subtitle={`Logged ${formatLoggedAt(expense.createdAt)} · ${expense.staffMember}`}
      backTo="/finances"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-title" className={labelClass}>
            Expense title
          </label>
          <input
            id="expense-title"
            type="text"
            required
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-amount" className={labelClass}>
            Amount (฿)
          </label>
          {/* step="any": a number input defaults to step 1, which would
              reject ฿12.50 */}
          <input
            id="expense-amount"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
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

export default EditExpense;
