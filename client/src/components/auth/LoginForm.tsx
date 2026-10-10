'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { errorMessage } from '@/lib/api';
import { login } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { DEMO_ACCOUNTS, type DemoAccount, SHOW_DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { PasswordField } from './PasswordField';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The email being signed in, so the right button shows the spinner. */
  const [pending, setPending] = useState<string | null>(null);

  const signIn = async (withEmail: string, withPassword: string) => {
    setError(null);
    setPending(withEmail);
    try {
      await login(withEmail, withPassword);
      // On success the page reloads into the user's home, so `pending` stays set.
    } catch (err) {
      setError(errorMessage(err));
      setPending(null);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void signIn(email.trim(), password);
  };

  const signInAsDemo = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    void signIn(account.email, account.password);
  };

  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-500">Sign in to continue your application or open your dashboard.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <InputField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={pending !== null && pending === email.trim()}
          disabled={pending !== null || !email || !password}
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{' '}
        <Link href="/signup" className="font-medium text-brand-700 underline-offset-4 hover:underline">
          Create a borrower account
        </Link>
      </p>

      {SHOW_DEMO_ACCOUNTS && (
        <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4" aria-labelledby="demo-heading">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="demo-heading" className="text-sm font-semibold text-slate-900">
              Demo accounts
            </h2>
            <p className="text-xs text-slate-500">One click signs you in</p>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.role}>
                <button
                  type="button"
                  onClick={() => signInAsDemo(account)}
                  disabled={pending !== null}
                  className={cn(
                    'w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-all',
                    'hover:border-brand-500 hover:shadow-card focus-visible:outline-2 focus-visible:outline-brand-600',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    pending === account.email && 'border-brand-500 ring-2 ring-brand-500/20',
                  )}
                >
                  <span className="block text-sm font-medium text-slate-900">{account.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{account.sees}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
