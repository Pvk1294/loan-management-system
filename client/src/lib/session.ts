import type { Role, User } from '@/types/api';

/**
 * The browser's copy of the login session.
 *
 * The JWT lives in a cookie on the frontend's own domain. It is sent to the
 * API as an `Authorization: Bearer` header (never as a cookie, since the API
 * is on another domain), and the cookie lets `proxy.ts` see who is logged in
 * before a page renders. The user object is kept in localStorage so the UI can
 * show a name without waiting for a request.
 *
 * This is a small external store so React can subscribe to it with
 * `useSyncExternalStore`: logging in or out in one place updates every
 * component that reads the session.
 */

export const TOKEN_COOKIE = 'lms_token';
const USER_STORAGE_KEY = 'lms_user';

export interface Session {
  token: string;
  user: User;
}

let cached: Session | null | undefined;
const listeners = new Set<() => void>();

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

/** Reads the payload of a JWT without verifying it. Verification is the API's job. */
export function decodeTokenPayload(token: string): { sub?: string; role?: Role; exp?: number } | null {
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    return base64 ? JSON.parse(atob(base64)) : null;
  } catch {
    return null;
  }
}

function load(): Session | null {
  const token = readCookie(TOKEN_COOKIE);
  if (!token) return null;
  try {
    const user = JSON.parse(window.localStorage.getItem(USER_STORAGE_KEY) ?? 'null') as User | null;
    return user ? { token, user } : null;
  } catch {
    return null;
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export const sessionStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): Session | null {
    if (cached === undefined) cached = load();
    return cached;
  },

  /** On the server there is never a session; the real one is read after hydration. */
  getServerSnapshot(): Session | null {
    return null;
  },

  set(session: Session): void {
    const expiresAt = decodeTokenPayload(session.token)?.exp;
    const lifetime = expiresAt ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : 24 * 60 * 60;
    writeCookie(TOKEN_COOKIE, session.token, lifetime);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
    cached = session;
    notify();
  },

  clear(): void {
    writeCookie(TOKEN_COOKIE, '', 0);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    cached = null;
    notify();
  },
};

export const getToken = (): string | null => sessionStore.getSnapshot()?.token ?? null;
