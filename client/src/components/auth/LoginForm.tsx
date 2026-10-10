'use client';

import { type CSSProperties, type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { API_URL, errorMessage } from '@/lib/api';
import { login } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { DEMO_ACCOUNTS, type DemoAccount, SHOW_DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { PasswordField } from './PasswordField';

const SLOW_AFTER_MS = 4000;

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  // Free hosting puts an idle API to sleep; touching it now means it is awake by the time the form is sent.
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [pending]);

  const signIn = async (withEmail: string, withPassword: string) => {
    setError(null);
    setPending(withEmail);
    try {
      await login(withEmail, withPassword);
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
    <div>
      <h1 className="display reveal text-[34px] leading-tight text-ink">Welcome back</h1>
      <p className="reveal mt-2 text-[15px] text-ink-muted" style={{ '--i': 1 } as CSSProperties}>
        Sign in to continue your application or open your workspace.
      </p>

      <form onSubmit={onSubmit} className="reveal mt-9 space-y-4" style={{ '--i': 2 } as CSSProperties} noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        {slow && (
          <Alert tone="info" title="Waking the server">
            It sleeps when nobody has used it for a while. The first request can take up to a minute.
          </Alert>
        )}
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
          variant="ink"
          size="lg"
          fullWidth
          loading={pending !== null && pending === email.trim()}
          disabled={pending !== null || !email || !password}
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="reveal mt-6 text-center text-sm text-ink-muted" style={{ '--i': 3 } as CSSProperties}>
        New here?{' '}
        <Link href="/signup" className="font-medium text-brand-700 underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      {SHOW_DEMO_ACCOUNTS && (
        <section className="reveal mt-12" style={{ '--i': 4 } as CSSProperties} aria-labelledby="demo-heading">
          <div className="flex items-center gap-3">
            <h2 id="demo-heading" className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
              Evaluator access
            </h2>
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>
          <p className="mt-2 text-[13px] text-ink-muted">Open the app as any role with one click. Passwords are in the README.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => signInAsDemo(account)}
                disabled={pending !== null}
                title={account.sees}
                className={cn(
                  'cursor-pointer rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink transition-all duration-200',
                  'hover:-translate-y-px hover:border-ink hover:shadow-card focus-visible:outline-2 focus-visible:outline-brand-600',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  pending === account.email && 'border-ink bg-ink text-paper',
                )}
              >
                {account.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
