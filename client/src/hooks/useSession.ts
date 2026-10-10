'use client';

import { useSyncExternalStore } from 'react';
import { type Session, sessionStore } from '@/lib/session';

const noopSubscribe = () => () => {};

/**
 * False while the page is still the server-rendered HTML, true once React has
 * taken over in the browser. The session lives in the browser only, so until
 * this is true we cannot know whether anyone is logged in.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export interface SessionState {
  /** False until the session has been read from the browser. */
  ready: boolean;
  session: Session | null;
}

export function useSession(): SessionState {
  const ready = useHydrated();
  const session = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot,
  );
  return { ready, session };
}
