import { useCallback, useEffect, useState } from 'react';

/** Counts down from `seconds` to zero once per second; `restart` starts it again. */
export function useCooldown(seconds: number): [remaining: number, restart: () => void] {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  const restart = useCallback(() => setRemaining(seconds), [seconds]);
  return [remaining, restart];
}
