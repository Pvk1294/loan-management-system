'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function subscribeToQuery(query: string, callback: () => void): () => void {
  const list = window.matchMedia(query);
  list.addEventListener('change', callback);
  return () => list.removeEventListener('change', callback);
}

/** True when a CSS media query matches. False during server rendering. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribeToQuery(query, callback),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Rolls a number from its previous value to `target` over `durationMs`.
 * Used wherever an amount changes in front of the user, so the figure moves
 * rather than jumping. With reduced motion on, it jumps.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / durationMs);
      shown.current = from + (target - from) * easeOutCubic(t);
      setValue(shown.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  // With reduced motion the first frame lands on the target; until it runs, show it directly.
  return reduced ? target : value;
}
