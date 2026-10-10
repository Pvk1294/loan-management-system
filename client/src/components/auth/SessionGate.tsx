'use client';

import { type ReactNode, createContext, useContext, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';
import { LOGIN_PATH, homePathFor, isStaff } from '@/lib/rbac';
import { sessionStore } from '@/lib/session';
import type { User } from '@/types/api';

const UserContext = createContext<User | null>(null);

interface SessionGateProps {
  /** Who this part of the app is for. */
  audience: 'borrower' | 'staff';
  children: ReactNode;
}

/**
 * Wraps the borrower portal and the dashboard. `proxy.ts` has already turned
 * away the wrong audience on the server; this is the same check in the browser,
 * for the cases the server cannot see (the session expiring while a tab is
 * open, or logging out in another tab).
 *
 * The session exists only in the browser, so the server never knows the user.
 * Children are therefore always rendered, and read the user with `useUser()`,
 * which is null until the session has been read. Each page shows its skeleton
 * for that moment, which lets Next.js prerender the page frame and show it
 * instantly instead of a blank screen.
 */
export function SessionGate({ audience, children }: SessionGateProps) {
  const { ready, session } = useSession();
  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const allowed = user !== null && isStaff(user.role) === (audience === 'staff');

  useEffect(() => {
    if (!ready) return;
    if (!user) window.location.replace(LOGIN_PATH);
    else if (!allowed) window.location.replace(homePathFor(user.role));
  }, [ready, user, allowed]);

  // Confirm with the API that the token is still good and the role has not
  // changed. A 401 clears the session inside the API client, which lands in
  // the redirect above.
  useEffect(() => {
    if (!token) return;
    api<{ user: User }>('/auth/me')
      .then(({ user: fresh }) => {
        const current = sessionStore.getSnapshot();
        if (current && JSON.stringify(current.user) !== JSON.stringify(fresh)) {
          sessionStore.set({ token: current.token, user: fresh });
        }
      })
      .catch(() => undefined);
  }, [token]);

  return <UserContext.Provider value={ready && allowed ? user : null}>{children}</UserContext.Provider>;
}

/** The signed-in user, or null while the session is still being read. */
export function useUser(): User | null {
  return useContext(UserContext);
}
