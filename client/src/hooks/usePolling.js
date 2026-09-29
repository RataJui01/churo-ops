import { useEffect, useState } from 'react';

// Two operators take orders on separate phones with a shared backend, kept in
// sync by polling rather than websockets (see CLAUDE.md) — 7s sits in the
// middle of the agreed 5-10s range.
const POLL_INTERVAL_MS = 7000;

// Runs `load()` immediately, then every POLL_INTERVAL_MS. `data` stays null
// until the first successful load. Only that first failure sets `error`,
// meant for a full-page error state; a later poll that fails just keeps the
// last known `data` on screen and tries again next tick. `retry()` (for a
// "Try again" button) re-runs the whole thing from a loading state.
export function usePolling(load) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Local to this effect run, not React state: lets a later poll tell "the
    // very first load" apart from "a refresh that happened to fail" without
    // re-running (and re-arming) the interval on every successful fetch.
    let hasLoadedOnce = false;

    async function refresh() {
      try {
        const loaded = await load();
        if (cancelled) return;
        setData(loaded);
        setError('');
        hasLoadedOnce = true;
      } catch (err) {
        if (cancelled) return;
        // Only the initial load shows a full error state; a poll that fails
        // later just keeps the last known data on screen until the next tick.
        if (!hasLoadedOnce) {
          // fetch only rejects (TypeError) on network failure
          setError(
            err instanceof TypeError
              ? 'Cannot reach the server. Check your connection.'
              : err.message,
          );
        }
      }
    }

    refresh();
    const intervalId = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [attempt, load]);

  function retry() {
    setError('');
    setAttempt(attempt + 1);
  }

  return { data, setData, error, retry };
}
