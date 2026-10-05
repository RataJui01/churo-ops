import { useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import { inputClass, labelClass } from '../src/components/formClasses.js';

function NewExpense() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  // Kept as a string and converted when sent, like Restock's quantity
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    // The server checks these too, but in development its error reads
    // "Expense validation failed: …" — and the browser's `required` lets a
    // title of only spaces through
    if (!title.trim()) {
      setError('Please enter what the expense was for.');
      return;
    }
    if (!(Number(amount) > 0)) {
      setError('Amount must be more than 0.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await getJson('/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify({ title, amount: Number(amount) }),
      });
      // replace: Back shouldn't return to a form that was already sent
      navigate('/finances', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Back goes to Finances as in the design, even when opened from Home's
  // quick action — same as Restock going back to Stock
  return (
    <SubPageShell title="Add expense" backTo="/finances">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-title" className={labelClass}>
            Expense title
          </label>
          <input
            id="expense-title"
            type="text"
            placeholder="e.g. Propane gas refill"
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
            placeholder="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
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
          {isSubmitting ? 'Adding…' : 'Add expense'}
        </button>
      </form>
    </SubPageShell>
  );
}

export default NewExpense;
