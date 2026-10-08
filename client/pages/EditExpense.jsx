import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import {
  AFFECTED_BY,
  LOAD_ONCE,
  expenseQuery,
  refreshAfterSave,
} from '../src/queries.js';
import { formatLoggedAt } from '../src/constants/stock.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import { inputClass, labelClass } from '../src/components/formClasses.js';

// Loads the expense, then hands it to the form. Split in two so the form can
// start its fields straight from the data (useState(expense.title)) instead
// of copying each one in an effect once it arrives.
function EditExpense() {
  const { id } = useParams();
  // Loaded once, not polled, so what's being edited can't change underfoot
  const { data: expense, error } = useQuery({
    ...expenseQuery(id),
    ...LOAD_ONCE,
  });

  // Loading or failed (a 404 also covers one deleted on the other phone)
  if (!expense) {
    return (
      <SubPageShell title="Edit expense" backTo="/finances">
        {error ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-small text-danger">
              {errorMessage(error)}
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

  return <EditExpenseForm expense={expense} />;
}

// expense: as loaded — also what "changed" is measured against on Save
function EditExpenseForm({ expense }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const url = `/api/v1/expenses/${expense._id}`;

  const [title, setTitle] = useState(expense.title);
  // Kept as a string and converted when used, like NewExpense
  const [amount, setAmount] = useState(String(expense.amount));

  const [error, setError] = useState('');
  // Two taps, like the app's other delete buttons (Jui, 2026-10-05)
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // replace: Back shouldn't return to an expense that was just saved/deleted
  const leave = () => navigate('/finances', { replace: true });

  // Each waits for Finances to be refetched, so it shows the change on arrival
  const save = useMutation({
    mutationFn: async (changes) => {
      await getJson(url, { method: 'PATCH', body: JSON.stringify(changes) });
      await refreshAfterSave(queryClient, AFFECTED_BY.expense);
    },
    onSuccess: leave,
    onError: (err) => setError(errorMessage(err)),
  });
  // A real delete (Jui, 2026-10-05) — hence the two taps
  const remove = useMutation({
    mutationFn: async () => {
      await getJson(url, { method: 'DELETE' });
      await refreshAfterSave(queryClient, AFFECTED_BY.expense);
    },
    onSuccess: leave,
    onError: (err) => {
      setError(errorMessage(err));
      setConfirmingDelete(false);
    },
  });
  const isSubmitting = save.isPending || remove.isPending;

  // Only what was actually changed, like EditStockItem — so an edit made on
  // the other phone to the other field isn't written over
  function changedFields() {
    const changes = {};
    if (title.trim() !== expense.title) changes.title = title;
    if (Number(amount) !== expense.amount) changes.amount = Number(amount);
    return changes;
  }

  function handleSubmit(e) {
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
      leave();
      return;
    }
    save.mutate(changes);
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError('');
    remove.mutate();
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
            {save.isPending ? 'Saving…' : 'Save changes'}
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
