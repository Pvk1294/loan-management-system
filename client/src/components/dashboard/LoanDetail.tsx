'use client';

import { type ReactNode, useState } from 'react';
import { Eye, FileText, Inbox } from 'lucide-react';
import { useUser } from '@/components/auth/SessionGate';
import { DocumentViewer } from '@/components/DocumentViewer';
import { LoanHistory } from '@/components/loan/LoanHistory';
import { RepaymentSummary } from '@/components/loan/RepaymentSummary';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Dialog';
import { useMediaQuery } from '@/hooks/useMotion';
import { cn } from '@/lib/cn';
import { EMPLOYMENT_LABELS, formatDate, formatFileSize, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan } from '@/types/api';

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Details({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[13px] text-ink-muted">{label}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Everything about one loan. The salary slip is offered only to roles the API lets read it. */
function LoanDetailBody({ loan, children }: { loan: Loan; children?: ReactNode }) {
  const user = useUser();
  const [viewingSlip, setViewingSlip] = useState(false);
  const canViewSlip = user?.role === 'admin' || user?.role === 'sanction';
  const hasRepayments = loan.status === 'DISBURSED' || loan.status === 'CLOSED';

  return (
    <>
      <DetailSection title="Loan">
        <div className="mb-4 flex items-end justify-between gap-4 rounded-2xl bg-paper p-4">
          <div>
            <p className="text-[13px] text-ink-muted">Requested</p>
            <p className="amount mt-0.5 text-[28px] leading-none text-ink">{formatRupees(loan.principal)}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-ink-muted">To repay</p>
            <p className="amount mt-0.5 text-xl leading-none text-ink">{formatRupeesExact(loan.totalRepayment)}</p>
          </div>
        </div>
        <Details
          items={[
            ['Tenure', formatTenure(loan.tenureDays)],
            ['Interest', `${formatRupeesExact(loan.interest)} at ${loan.interestRate}% p.a.`],
            ['Applied', formatDate(loan.appliedAt)],
            ...(loan.disbursedAt ? [['Disbursed', formatDate(loan.disbursedAt)] as [string, ReactNode]] : []),
            ...(loan.dueDate ? [['Due', formatDate(loan.dueDate)] as [string, ReactNode]] : []),
          ]}
        />
        {loan.status === 'REJECTED' && loan.rejectionReason && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <span className="font-semibold">Rejected:</span> {loan.rejectionReason}
          </p>
        )}
      </DetailSection>

      {hasRepayments && (
        <DetailSection title="Repayment">
          <RepaymentSummary loan={loan} />
        </DetailSection>
      )}

      <DetailSection title="Applicant">
        <Details
          items={[
            ['Full name', loan.applicant.fullName],
            ['Email', loan.borrower.email ?? '—'],
            ['PAN', <span key="pan" className="font-mono tracking-wider">{loan.applicant.pan}</span>],
            ['Date of birth', `${formatDate(loan.applicant.dateOfBirth)} (${loan.applicant.age})`],
            ['Monthly salary', formatRupees(loan.applicant.monthlySalary)],
            ['Employment', EMPLOYMENT_LABELS[loan.applicant.employmentMode]],
          ]}
        />
      </DetailSection>

      {canViewSlip && (
        <DetailSection title="Salary slip">
          <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-2 text-ink-muted">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{loan.salarySlip.filename}</p>
              <p className="text-[13px] text-ink-muted">
                {formatFileSize(loan.salarySlip.size)} · {formatDate(loan.salarySlip.uploadedAt)}
              </p>
            </div>
            <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => setViewingSlip(true)}>
              View
            </Button>
          </div>
          <DocumentViewer document={viewingSlip ? loan.salarySlip : null} onClose={() => setViewingSlip(false)} />
        </DetailSection>
      )}

      {children}

      <DetailSection title="History">
        <LoanHistory history={loan.statusHistory} />
      </DetailSection>
    </>
  );
}

interface LoanDetailProps {
  loan: Loan | null;
  onClose: () => void;
  /** The module's action buttons for this loan. */
  actions?: ReactNode;
  /** Extra content between the applicant and the history, such as a payment ledger. */
  children?: ReactNode;
  /** What to say in the side panel when no loan is open. */
  placeholder: { title: string; text: string };
}

/**
 * Where a loan's details appear. On a wide screen they sit beside the list, so
 * a reviewer moves from one application to the next without a modal in the
 * way. On smaller screens the same content slides in as a drawer.
 */
export function LoanDetail({ loan, onClose, actions, children, placeholder }: LoanDetailProps) {
  const sideBySide = useMediaQuery('(min-width: 1280px)');

  if (!sideBySide) {
    return (
      <Drawer
        open={loan !== null}
        onClose={onClose}
        title={loan?.applicant.fullName ?? ''}
        description={
          loan && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{loan.reference}</span>
              <LoanStatusBadge status={loan.status} />
            </span>
          )
        }
        footer={actions}
      >
        {loan && <LoanDetailBody loan={loan}>{children}</LoanDetailBody>}
      </Drawer>
    );
  }

  return (
    <aside className="sticky top-6 flex h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-card" aria-label="Loan details">
      {loan ? (
        <div key={loan.id} className="flex min-h-0 flex-1 flex-col animate-fade">
          <div className="border-b border-line px-6 py-5">
            <h2 className="display text-xl leading-tight text-ink">{loan.applicant.fullName}</h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <span className="font-mono text-xs">{loan.reference}</span>
              <LoanStatusBadge status={loan.status} />
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <LoanDetailBody loan={loan}>{children}</LoanDetailBody>
          </div>
          {actions && <div className={cn('flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-6 py-4')}>{actions}</div>}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-2 text-ink-faint">
            <Inbox className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="display mt-5 text-lg text-ink">{placeholder.title}</p>
          <p className="mt-1.5 max-w-xs text-sm text-ink-muted">{placeholder.text}</p>
        </div>
      )}
    </aside>
  );
}
