'use client';

import { type FormEvent, useState } from 'react';
import { ArrowRight, Briefcase, Check, CircleDashed, Store, UserRoundX, X } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { InputField } from '@/components/ui/Field';
import { ApiError, api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { RULE_FIELD, ageFromDateOfBirth, eligibilityHints } from '@/lib/eligibility';
import { EMPLOYMENT_LABELS, formatRupees, todayInIndia } from '@/lib/format';
import type { BreFailure, BreRuleCode, EligibilityRules, EmploymentMode, Profile } from '@/types/api';

interface PersonalDetailsStepProps {
  profile: Profile | null;
  defaultName: string;
  rules: EligibilityRules;
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

/** Fields that must be filled in before the form can be sent at all. */
function findMissing(values: FormValues): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (values.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  if (!values.pan.trim()) errors.pan = 'Enter your PAN.';
  if (!values.dateOfBirth) errors.dateOfBirth = 'Enter your date of birth.';
  if (values.monthlySalary === '' || !Number.isFinite(Number(values.monthlySalary))) {
    errors.monthlySalary = 'Enter your monthly salary.';
  }
  if (!values.employmentMode) errors.employmentMode = 'Choose how you are employed.';
  return errors;
}

/**
 * Step 2: personal details and the eligibility check.
 *
 * Two kinds of feedback, kept visibly different:
 *  - red: the field is empty or malformed, so the form will not submit;
 *  - amber: the value is fine as data but fails an eligibility rule. The form
 *    still submits, because the decision belongs to the server, which answers
 *    with the full list of reasons.
 */
export function PersonalDetailsStep({ profile, defaultName, rules, onEligible }: PersonalDetailsStepProps) {
  const [today] = useState(todayInIndia);
  const [values, setValues] = useState<FormValues>({
    fullName: profile?.fullName ?? defaultName,
    pan: profile?.pan ?? '',
    dateOfBirth: profile?.dateOfBirth ?? '',
    monthlySalary: profile ? String(profile.monthlySalary) : '',
    employmentMode: profile?.employmentMode ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  /** The server's verdict, when it was a rejection. */
  const [rejection, setRejection] = useState<BreFailure[]>(
    profile?.bre.status === 'REJECTED' ? profile.bre.failures : [],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hints = eligibilityHints(values, rules, today);
  const age = values.dateOfBirth ? ageFromDateOfBirth(values.dateOfBirth, today) : null;
  const rejectedFields = new Set(rejection.map((failure) => RULE_FIELD[failure.rule]));

  const set = <K extends FieldName>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const missing = findMissing(values);
    setErrors(missing);
    setFormError(null);
    if (Object.keys(missing).length > 0) return;

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
      setRejection([]);
      onEligible();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'BRE_REJECTED') {
        setRejection((err.details as { failures: BreFailure[] }).failures);
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

  const checklist: { rule: BreRuleCode; label: string; answered: boolean }[] = [
    { rule: 'AGE', label: `Aged ${rules.MIN_AGE} to ${rules.MAX_AGE}`, answered: age !== null },
    {
      rule: 'SALARY',
      label: `Earns ${formatRupees(rules.MIN_MONTHLY_SALARY)} or more a month`,
      answered: values.monthlySalary !== '',
    },
    { rule: 'PAN', label: 'Has a valid PAN', answered: values.pan.trim() !== '' },
    { rule: 'EMPLOYMENT', label: 'Salaried or self-employed', answered: values.employmentMode !== '' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
      <Card>
        <CardHeader title="Personal details" description="We use these to check whether you are eligible to apply." />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {rejection.length > 0 && (
              <Alert tone="error" title="You are not eligible to apply with these details">
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {rejection.map((failure) => (
                    <li key={failure.rule}>{failure.message}</li>
                  ))}
                </ul>
                <p className="mt-2">If something was entered incorrectly, correct it below and check again.</p>
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
                className="font-mono tracking-[0.18em] uppercase placeholder:tracking-[0.18em]"
                value={values.pan}
                onChange={(event) => set('pan', event.target.value.toUpperCase().replace(/\s/g, ''))}
                error={errors.pan}
                warning={hints.PAN ?? (rejectedFields.has('pan') ? 'This PAN was not accepted.' : undefined)}
                hint="10 characters: 5 letters, 4 digits, 1 letter"
              />
              <InputField
                label="Date of birth"
                name="dateOfBirth"
                type="date"
                max={today}
                value={values.dateOfBirth}
                onChange={(event) => set('dateOfBirth', event.target.value)}
                error={errors.dateOfBirth}
                warning={hints.AGE}
                hint={age !== null && age >= 0 ? `You are ${age} years old` : `You must be between ${rules.MIN_AGE} and ${rules.MAX_AGE}`}
              />
              <InputField
                label="Monthly salary"
                name="monthlySalary"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                prefix="₹"
                placeholder="60000"
                value={values.monthlySalary}
                onChange={(event) => set('monthlySalary', event.target.value)}
                error={errors.monthlySalary}
                warning={hints.SALARY}
                hint={
                  values.monthlySalary !== '' && Number(values.monthlySalary) > 0
                    ? `${formatRupees(Number(values.monthlySalary))} a month`
                    : 'Your take-home pay each month'
                }
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Employment</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {EMPLOYMENT_OPTIONS.map(({ value, icon: Icon, caption }) => {
                  const selected = values.employmentMode === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        'relative flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3.5 transition-all',
                        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600',
                        selected ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/15' : 'border-slate-300 hover:border-slate-400',
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
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-sm font-medium text-slate-900">{EMPLOYMENT_LABELS[value]}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{caption}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.employmentMode ? (
                <p className="mt-2 text-[13px] text-rose-600">{errors.employmentMode}</p>
              ) : hints.EMPLOYMENT ? (
                <p className="mt-2 text-[13px] text-amber-700">{hints.EMPLOYMENT}</p>
              ) : null}
            </fieldset>

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Your details are checked securely on our servers.</p>
              <Button type="submit" size="lg" loading={submitting}>
                Check eligibility
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <aside>
        <Card className="lg:sticky lg:top-24">
          <CardHeader title="Who can apply" description="All four must be met." />
          <CardBody className="pt-4">
            <ul className="space-y-3">
              {checklist.map(({ rule, label, answered }) => {
                const state = !answered ? 'pending' : hints[rule] ? 'fail' : 'pass';
                return (
                  <li key={rule} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                        state === 'pass' && 'bg-emerald-100 text-emerald-700',
                        state === 'fail' && 'bg-rose-100 text-rose-700',
                        state === 'pending' && 'text-slate-300',
                      )}
                    >
                      {state === 'pass' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {state === 'fail' && <X className="h-3.5 w-3.5" aria-hidden="true" />}
                      {state === 'pending' && <CircleDashed className="h-5 w-5" aria-hidden="true" />}
                    </span>
                    <span className={cn(state === 'fail' ? 'text-rose-800' : state === 'pass' ? 'text-slate-900' : 'text-slate-500')}>
                      {label}
                      <span className="sr-only">
                        {state === 'pass' ? ' (met)' : state === 'fail' ? ' (not met)' : ' (not answered yet)'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
              This list updates as you type, but it is only a preview. The final decision is made when you press
              “Check eligibility”.
            </p>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
