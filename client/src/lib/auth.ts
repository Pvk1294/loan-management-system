import type { AuthResult } from '@/types/api';
import { api } from './api';
import { LOGIN_PATH, homePathFor } from './rbac';
import { sessionStore } from './session';

/**
 * Moving between "logged out" and "logged in" uses a full page load rather
 * than a client-side navigation. That throws away everything the router has
 * cached for the previous user, so one person's pages can never be shown to
 * the next person who signs in on the same browser.
 */
function startSession({ token, user }: AuthResult): void {
  sessionStore.set({ token, user });
  window.location.assign(homePathFor(user.role));
}

export async function login(email: string, password: string): Promise<void> {
  startSession(await api<AuthResult>('/auth/login', { method: 'POST', body: { email, password } }));
}

export async function signup(name: string, email: string, password: string): Promise<void> {
  startSession(await api<AuthResult>('/auth/signup', { method: 'POST', body: { name, email, password } }));
}

/** JWTs are stateless, so logging out is simply forgetting the token. */
export function logout(): void {
  sessionStore.clear();
  window.location.assign(LOGIN_PATH);
}
