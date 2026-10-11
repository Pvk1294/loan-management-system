'use client';

import { type CSSProperties, type FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Circle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { ApiError, errorMessage } from '@/lib/api';
import { signup } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { nameProblem } from '@/lib/validation';
import { PasswordField } from './PasswordField';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'A letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: 'A number', test: (value: string) => /[0-9]/.test(value) },
];

type Fields = 'name' | 'email' | 'password';

export function SignupForm() {
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: Fields) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = (): Partial<Record<Fields, string>> => {
    const found: Partial<Record<Fields, string>> = {};
    const nameError = nameProblem(values.name);
    if (nameError) found.name = nameError;
    if (!EMAIL_REGEX.test(values.email.trim())) found.email = 'Enter a valid email address.';
    if (!PASSWORD_RULES.every((rule) => rule.test(values.password))) found.password = 'Choose a password that meets all three rules.';
    return found;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signup(values.name.trim(), values.email.trim(), values.password);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setErrors({ email: err.message });
      else if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors);
      else setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="display reveal text-[34px] leading-tight text-ink">Create your account</h1>
      <p className="reveal mt-2 text-[15px] text-ink-muted" style={{ '--i': 1 } as CSSProperties}>
        A minute now, and you can apply straight away.
      </p>

      <form onSubmit={onSubmit} className="reveal mt-9 space-y-4" style={{ '--i': 2 } as CSSProperties} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <InputField label="Full name" name="name" autoComplete="name" placeholder="As on your PAN card" value={values.name} onChange={update('name')} error={errors.name} />
        <InputField label="Email" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={update('email')} error={errors.email} />
        <div>
          <PasswordField label="Password" name="password" autoComplete="new-password" placeholder="Create a password" value={values.password} onChange={update('password')} error={errors.password} />
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(values.password);
              return (
                <li key={rule.label} className={cn('flex items-center gap-1.5 text-xs transition-colors', met ? 'text-brand-700' : 'text-ink-faint')}>
                  {met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
                  {rule.label}
                  <span className="sr-only">{met ? '(met)' : '(not met yet)'}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <Button type="submit" variant="ink" size="lg" fullWidth loading={submitting}>
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="reveal mt-6 text-center text-sm text-ink-muted" style={{ '--i': 3 } as CSSProperties}>
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
