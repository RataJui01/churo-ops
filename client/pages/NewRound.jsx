import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getJson } from '../src/api.js';
import SubPageShell from '../src/components/SubPageShell.jsx';
import { inputClass, labelClass } from '../src/components/formClasses.js';


// "2026-09-23" — what <input type="date"> expects
function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewRound() {
  const navigate = useNavigate();
  const [openDate, setOpenDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await getJson('/api/v1/rounds', {
        method: 'POST',
        body: JSON.stringify({ name, openDate, deliveryDate }),
      });
      navigate('/', { replace: true });
    } catch (err) {
      // fetch only rejects (TypeError) on network failure
      setError(
        err instanceof TypeError
          ? 'Cannot reach the server. Check your connection.'
          : err.message,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SubPageShell title="New round" backTo="/">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="round-open" className={labelClass}>
            Open date
          </label>
          <input
            id="round-open"
            type="date"
            required
            value={openDate}
            onChange={(e) => setOpenDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="round-deliver" className={labelClass}>
            Delivery date
          </label>
          <input
            id="round-deliver"
            type="date"
            required
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="round-name" className={labelClass}>
            Round name
          </label>
          <input
            id="round-name"
            type="text"
            placeholder="e.g. Round 6"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          disabled={isLoading}
          className="min-h-12 rounded-md bg-brand text-button-primary text-on-brand hover:bg-brand-hover active:bg-brand-hover disabled:opacity-60"
        >
          {isLoading ? 'Creating…' : 'Create round'}
        </button>
      </form>
    </SubPageShell>
  );
}

export default NewRound;
