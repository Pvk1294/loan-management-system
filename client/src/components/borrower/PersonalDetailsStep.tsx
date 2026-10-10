'use client';

import { type CSSProperties, type FormEvent, useState } from 'react';
import { ArrowRight, Briefcase, Clock3, Lock, Store, UserRoundX } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { InputField } from '@/components/ui/Field';
import { ApiError, api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PAN_REGEX, RULE_FIELD } from '@/lib/eligibility';
import { EMPLOYMENT_LABELS, formatRupees, todayInIndia } from '@/lib/format';
import type { BreFailure, EmploymentMode, Profile } from '@/types/api';

interface PersonalDetailsStepProps {
  profile: Profile | null;
  defaultName: string;
  onEligible: () => void;
}

interface FormValues {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: string;
  employmentMode: EmploymentMode | '';
}

type FieldName = keyof FormValues;

const EMPLOYMENT_OPTIONS: { value: EmploymentMode; icon: typeof Briefcase; caption: string }[] = [
  { value: 'SALARIED', icon: Briefcase, caption: 'Paid a monthly salary' },
  { value: 'SELF_EMPLOYED', icon: Store, caption: 'Business or freelance' },
  { value: 'UNEMPLOYED', icon: UserRoundX, caption: 'Not working right now' },
];

const WHY_WE_ASK = [
  { title: 'PAN', text: 'Confirms your identity with the tax department.' },
  { title: 'Salary', text: 'So we offer an amount you can comfortably repay.' },
  { title: 'Date of birth', text: 'A legal requirement for any credit agreement.' },
];

/** Shape checks only: is everything filled in and well-formed? Eligibility is the server's call. */
function findProblems(values: FormValues): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (values.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  if (!PAN_REGEX.test(values.pan.trim())) errors.pan = 'A PAN has 5 letters, 4 digits and 1 letter, like ABCDE1234F.';
  if (!values.dateOfBirth) errors.dateOfBirth = 'Enter your date of birth.';
  if (values.monthlySalary === '' || !Number.isFinite(Number(values.monthlySalary)) || Number(values.monthlySalary) < 0) {
    errors.monthlySalary = 'Enter your monthly salary.';
  }
  if (!values.employmentMode) errors.employmentMode = 'Choose how you are employed.';
  return errors;
}

/**
 * Step 1: personal details. The server runs its eligibility rules on submit and
 * either moves the borrower on or explains, in full, why it cannot.
 */
export function PersonalDetailsStep({ profile, defaultName, onEligible }: PersonalDetailsStepProps) {
  const [today] = useState(todayInIndia);
  const [values, setValues] = useState<FormValues>({
    fullName: profile?.fullName ?? defaultName,
    pan: profile?.pan ?? '',
    dateOfBirth: profile?.dateOfBirth ?? '',
    monthlySalary: profile ? String(profile.monthlySalary) : '',
    employmentMode: profile?.employmentMode ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [refusal, setRefusal] = useState<BreFailure[]>(profile?.bre.status === 'REJECTED' ? profile.bre.failures : []);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refusedFields = new Set(refusal.map((failure) => RULE_FIELD[failure.rule]));

  const set = <K extends FieldName>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problems = findProblems(values);
    setErrors(problems);
    setFormError(null);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    try {
      await api<{ profile: Profile }>('/borrower/profile', {
        method: 'PUT',
        body: {
          fullName: values.fullName.trim(),
          pan: values.pan.trim().toUpperCase(),
          dateOfBirth: values.dateOfBirth,
          monthlySalary: Number(values.monthlySalary),
          employmentMode: values.employmentMode,
        },
      });
      setRefusal([]);
      onEligible();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'BRE_REJECTED') {
        setRefusal((err.details as { failures: BreFailure[] }).failures);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors);
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const highlight = (field: FieldName) => (refusedFields.has(field as never) ? 'border-rose-300' : undefined);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
      <Card className="reveal">
        <CardHeader title="About you" description="A few details so we can check what we can offer." />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            {refusal.length > 0 && (
              <Alert tone="error" title="We can't offer you a loan with these details">
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {refusal.map((failure) => (
                    <li key={failure.rule}>{failure.message}</li>
                  ))}
                </ul>
                <p className="mt-2">If something was entered incorrectly, correct it and check again.</p>
              </Alert>
            )}
            {formError && <Alert tone="error">{formError}</Alert>}

            <div className="grid gap-5 sm:grid-cols-2">
              <InputField
                label="Full name"
                name="fullName"
                autoComplete="name"
                placeholder="As on your PAN card"
                value={values.fullName}
                onChange={(event) => set('fullName', event.target.value)}
                error={errors.fullName}
              />
              <InputField
                label="PAN"
                name="pan"
                placeholder="ABCDE1234F"
                maxLength={10}
                autoCapitalize="characters"
                spellCheck={false}
                className={cn('font-mono tracking-[0.18em] uppercase placeholder:tracking-[0.18em]', highlight('pan'))}
                value={values.pan}
                onChange={(event) => set('pan', event.target.value.toUpperCase().replace(/\s/g, ''))}
                error={errors.pan}
              />
              <InputField
                label="Date of birth"
                name="dateOfBirth"
                type="date"
                max={today}
                className={highlight('dateOfBirth')}
                value={values.dateOfBirth}
                onChange={(event) => set('dateOfBirth', event.target.value)}
                error={errors.dateOfBirth}
              />
              <InputField
                label="Monthly salary"
                name="monthlySalary"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                prefix="₹"
                placeholder="60,000"
                className={highlight('monthlySalary')}
                value={values.monthlySalary}
                onChange={(event) => set('monthlySalary', event.target.value)}
                error={errors.monthlySalary}
                hint={
                  values.monthlySalary !== '' && Number(values.monthlySalary) > 0
                    ? `${formatRupees(Number(values.monthlySalary))} a month, after tax`
                    : 'Your take-home pay each month'
                }
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">Employment</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {EMPLOYMENT_OPTIONS.map(({ value, icon: Icon, caption }, i) => {
                  const selected = values.employmentMode === value;
                  return (
                    <label
                      key={value}
                      style={{ '--i': i } as CSSProperties}
                      className={cn(
                        'lift relative flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-4',
                        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600',
                        selected ? 'border-ink ring-4 ring-ink/8' : 'border-line-strong',
                        refusedFields.has('employmentMode') && selected && 'border-rose-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="employmentMode"
                        value={value}
                        checked={selected}
                        onChange={() => set('employmentMode', value)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                          selected ? 'bg-ink text-saffron-300' : 'bg-paper-2 text-ink-muted',
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-sm font-medium text-ink">{EMPLOYMENT_LABELS[value]}</span>
                        <span className="mt-0.5 block text-xs text-ink-muted">{caption}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.employmentMode && <p className="mt-2 text-[13px] text-rose-600">{errors.employmentMode}</p>}
            </fieldset>

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Checked securely on our servers. Nothing is shared.
              </p>
              <Button type="submit" variant="ink" size="lg" loading={submitting}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <aside className="reveal space-y-4" style={{ '--i': 2 } as CSSProperties}>
        <div className="rounded-[20px] bg-ink p-6 text-paper">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-paper/50 uppercase">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            About two minutes
          </p>
          <p className="display mt-3 text-xl leading-snug">Why we ask for these</p>
          <dl className="mt-4 space-y-3.5">
            {WHY_WE_ASK.map((item) => (
              <div key={item.title}>
                <dt className="text-sm font-medium text-saffron-300">{item.title}</dt>
                <dd className="mt-0.5 text-[13px] leading-relaxed text-paper/60">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
