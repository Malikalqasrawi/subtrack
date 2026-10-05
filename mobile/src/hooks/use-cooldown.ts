import { useCallback, useEffect, useState } from 'react';

/**
 * Counts down from `seconds` to zero once per second; `restart` starts it again.
 * With `startNow` off it waits at zero until the first restart.
 */
export function useCooldown(seconds: number, startNow = true): [remaining: number, restart: () => void] {
  const [remaining, setRemaining] = useState(startNow ? seconds : 0);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  const restart = useCallback(() => setRemaining(seconds), [seconds]);
  return [remaining, restart];
}
