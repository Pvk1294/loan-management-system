'use client';

import { useState } from 'react';
import { ServerCrash } from 'lucide-react';
import { useUser } from '@/components/auth/SessionGate';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Spinner';
import { useApiQuery } from '@/hooks/useApiQuery';
import { api } from '@/lib/api';
import { formatDate, formatRupees } from '@/lib/format';
import type { ApplicationOverview, ApplicationStep } from '@/types/api';
import { LoanConfigStep } from './LoanConfigStep';
import { LoanTracker } from './LoanTracker';
import { PersonalDetailsStep } from './PersonalDetailsStep';
import { SalarySlipStep } from './SalarySlipStep';
import { type Step, Stepper } from './Stepper';

type WizardStep = Exclude<ApplicationStep, 'TRACKING'>;

const STEPS: Step<WizardStep>[] = [
  { key: 'PERSONAL_DETAILS', label: 'Personal details', caption: 'Eligibility check' },
  { key: 'SALARY_SLIP', label: 'Salary slip', caption: 'Proof of income' },
  { key: 'LOAN_CONFIG', label: 'Loan & apply', caption: 'Amount and tenure' },
];

const ORDER: WizardStep[] = STEPS.map((step) => step.key);

/**
 * The borrower's home. The server says how far the application has got
 * (`nextStep`); this component shows that step, lets the borrower revisit
 * earlier ones, and switches to tracking once a loan exists.
 */
export function ApplicationPortal() {
  const user = useUser();
  // Nothing is requested until the session is known, so the call always carries a token.
  const { data, error, isLoading, reload } = useApiQuery(user ? 'borrower-application' : null, () =>
    api<ApplicationOverview>('/borrower/application'),
  );
  /** A step the borrower chose to look at; never beyond what the server has unlocked. */
  const [selectedStep, setSelectedStep] = useState<WizardStep | null>(null);
  /** True once the borrower asks to apply again after a finished loan. */
  const [startingNew, setStartingNew] = useState(false);

  if (error && !data) {
    return (
      <Card>
        <EmptyState
          icon={ServerCrash}
          tone="error"
          title="We could not load your application"
          description={error.message}
          action={<Button onClick={reload}>Try again</Button>}
        />
      </Card>
    );
  }
  if (!user || isLoading || !data) return <PortalSkeleton />;

  const firstName = user.name.split(' ')[0];
  const latestLoan = data.loans[0];

  // A loan in progress, or a finished one the borrower has not moved on from.
  const trackedLoan = data.activeLoan ?? (latestLoan && !startingNew ? latestLoan : null);
  if (trackedLoan) {
    const pastLoans = data.loans.filter((loan) => loan.id !== trackedLoan.id);
    return (
      <div className="space-y-6">
        <LoanTracker loan={trackedLoan} onStartNew={data.activeLoan ? undefined : () => setStartingNew(true)} />
        {pastLoans.length > 0 && (
          <Card>
            <CardHeader title="Earlier loans" />
            <CardBody className="pt-3">
              <ul className="divide-y divide-slate-100">
                {pastLoans.map((loan) => (
                  <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 tabular-nums">{formatRupees(loan.principal)}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{loan.reference}</span> · applied {formatDate(loan.appliedAt)}
                      </p>
                    </div>
                    <LoanStatusBadge status={loan.status} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  const furthest = data.nextStep as WizardStep;
  const step = ORDER[Math.min(ORDER.indexOf(selectedStep ?? furthest), ORDER.indexOf(furthest))];

  /** Re-reads the application, then shows the given step (or wherever the server says). */
  const advance = (to: WizardStep | null) => {
    setSelectedStep(to);
    reload();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {latestLoan ? 'New loan application' : `Welcome, ${firstName}`}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Three short steps. Borrow {formatRupees(data.rules.loan.MIN_AMOUNT)} to {formatRupees(data.rules.loan.MAX_AMOUNT)} for{' '}
          {data.rules.loan.MIN_TENURE_DAYS} to {data.rules.loan.MAX_TENURE_DAYS} days.
        </p>
      </header>

      <Stepper
        steps={STEPS}
        current={step}
        furthest={furthest}
        onSelect={setSelectedStep}
        leading={{ label: 'Account', caption: 'Signed in' }}
      />

      <div key={step} className="animate-rise">
        {step === 'PERSONAL_DETAILS' && (
          <PersonalDetailsStep
            profile={data.profile}
            defaultName={user.name}
            rules={data.rules.eligibility}
            onEligible={() => advance('SALARY_SLIP')}
          />
        )}
        {step === 'SALARY_SLIP' && (
          <SalarySlipStep
            salarySlip={data.profile?.salarySlip ?? null}
            maxSizeBytes={data.rules.salarySlip.maxSizeBytes}
            allowedMimeTypes={data.rules.salarySlip.allowedMimeTypes}
            onUploaded={() => advance('SALARY_SLIP')}
            onContinue={() => setSelectedStep('LOAN_CONFIG')}
            onBack={() => setSelectedStep('PERSONAL_DETAILS')}
          />
        )}
        {step === 'LOAN_CONFIG' && (
          <LoanConfigStep
            rules={data.rules.loan}
            onApplied={() => {
              setStartingNew(false);
              advance(null);
            }}
            onBack={() => setSelectedStep('SALARY_SLIP')}
          />
        )}
      </div>
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your application">
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
