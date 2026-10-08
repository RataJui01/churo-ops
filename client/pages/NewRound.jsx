import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { errorMessage, getJson } from '../src/api.js';
import { AFFECTED_BY, refreshAfterSave } from '../src/queries.js';
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
  const queryClient = useQueryClient();

  // Waits for Home's rounds to be refetched, so the new round is in Active
  // rounds on arrival
  const createRound = useMutation({
    mutationFn: async (round) => {
      await getJson('/api/v1/rounds', {
        method: 'POST',
        body: JSON.stringify(round),
      });
      await refreshAfterSave(queryClient, AFFECTED_BY.round);
    },
    onSuccess: () => navigate('/', { replace: true }),
    onError: (err) => setError(errorMessage(err)),
  });
  const isLoading = createRound.isPending;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    createRound.mutate({ name, openDate, deliveryDate });
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
