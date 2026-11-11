import { useEffect, useState } from 'react';

// The current time, refreshed every `intervalMs`, for "waiting 8 minutes"
// labels. Kept in state instead of calling Date.now() while rendering: React
// (and its Compiler) expects a render to give the same result every time, and
// a clock in state also keeps the minutes moving when nothing else changes.
export function useNow(intervalMs) {
  // Date.now passed as the function to call, not called here
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
