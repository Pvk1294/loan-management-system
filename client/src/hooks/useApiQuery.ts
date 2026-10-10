'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ApiError } from '@/lib/api';

interface Settled<T> {
  key: string;
  data?: T;
  error?: ApiError;
}

export interface QueryResult<T> {
  /** The latest data. While a new key is loading, this still holds the previous result. */
  data: T | undefined;
  error: ApiError | undefined;
  /** True until the first result for any key has arrived. */
  isLoading: boolean;
  /** True while the result on screen is not for the current key. */
  isFetching: boolean;
  /** Runs the request again, keeping the current data on screen meanwhile. */
  reload: () => void;
}

const toApiError = (err: unknown): ApiError =>
  err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN_ERROR', 'Something went wrong. Please try again.');

/**
 * Loads data for a component and keeps it in step with `key`: whenever the key
 * changes (a new page, tab or search term) the fetcher runs again. Passing
 * `null` as the key skips the request.
 *
 * Responses that arrive after the key has moved on are ignored, so a slow
 * request can never overwrite the result of a newer one.
 */
export function useApiQuery<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>): QueryResult<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const runFetcher = useEffectEvent(fetcher);

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();

    runFetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key, data });
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, error: toApiError(err) });
      },
    );

    return () => controller.abort();
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const isCurrent = settled !== null && settled.key === key;

  return {
    data: settled?.data,
    error: isCurrent ? settled.error : undefined,
    isLoading: key !== null && settled?.data === undefined && !(isCurrent && settled.error),
    isFetching: key !== null && !isCurrent,
    reload,
  };
}
