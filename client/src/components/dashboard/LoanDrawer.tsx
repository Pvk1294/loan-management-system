'use client';

import { type ReactNode, useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { useUser } from '@/components/auth/SessionGate';
import { DocumentViewer } from '@/components/DocumentViewer';
import { LoanHistory } from '@/components/loan/LoanHistory';
import { RepaymentSummary } from '@/components/loan/RepaymentSummary';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Dialog';
import { EMPLOYMENT_LABELS, formatDate, formatFileSize, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan } from '@/types/api';

interface LoanDrawerProps {
  loan: Loan | null;
  onClose: () => void;
  /** The module's action buttons for this loan. */
  footer?: ReactNode;
  /** Extra content between the applicant details and the history, such as the payment ledger. */
  children?: ReactNode;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-100 py-5 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Details({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Everything about one loan, opened from a row in any module. What the drawer
 * offers depends on who is looking: the salary slip is only shown to the roles
 * the API lets read it (Sanction and Admin).
 */
export function LoanDrawer({ loan, onClose, footer, children }: LoanDrawerProps) {
  const user = useUser();
  const [viewingSlip, setViewingSlip] = useState(false);
  const canViewSlip = user?.role === 'admin' || user?.role === 'sanction';
  const hasRepayments = loan?.status === 'DISBURSED' || loan?.status === 'CLOSED';

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
      footer={footer}
    >
      {loan && (
        <>
          <Section title="Loan">
            <Details
              items={[
                ['Loan amount', <span key="p" className="tabular-nums">{formatRupees(loan.principal)}</span>],
                ['Tenure', formatTenure(loan.tenureDays)],
                ['Interest', <span key="i" className="tabular-nums">{`${formatRupeesExact(loan.interest)} at ${loan.interestRate}% p.a.`}</span>],
                ['Total repayment', <span key="t" className="tabular-nums">{formatRupeesExact(loan.totalRepayment)}</span>],
                ['Applied on', formatDate(loan.appliedAt)],
                ...(loan.disbursedAt ? [['Disbursed on', formatDate(loan.disbursedAt)] as [string, ReactNode]] : []),
              ]}
            />
            {loan.status === 'REJECTED' && loan.rejectionReason && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <span className="font-semibold">Rejected:</span> {loan.rejectionReason}
              </p>
            )}
          </Section>

          {hasRepayments && (
            <Section title="Repayment">
              <RepaymentSummary loan={loan} />
            </Section>
          )}

          <Section title="Applicant">
            <Details
              items={[
                ['Full name', loan.applicant.fullName],
                ['Email', loan.borrower.email ?? '—'],
                ['PAN', <span key="pan" className="font-mono tracking-wider">{loan.applicant.pan}</span>],
                ['Date of birth', `${formatDate(loan.applicant.dateOfBirth)} (${loan.applicant.age} at application)`],
                ['Monthly salary', <span key="s" className="tabular-nums">{formatRupees(loan.applicant.monthlySalary)}</span>],
                ['Employment', EMPLOYMENT_LABELS[loan.applicant.employmentMode]],
              ]}
            />
          </Section>

          {canViewSlip && (
            <Section title="Salary slip">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{loan.salarySlip.filename}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(loan.salarySlip.size)} · uploaded {formatDate(loan.salarySlip.uploadedAt)}
                  </p>
                </div>
                <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => setViewingSlip(true)}>
                  View
                </Button>
              </div>
            </Section>
          )}

          {children}

          <Section title="History">
            <LoanHistory history={loan.statusHistory} />
          </Section>

          <DocumentViewer document={viewingSlip ? loan.salarySlip : null} onClose={() => setViewingSlip(false)} />
        </>
      )}
    </Drawer>
  );
}

export { Section as DrawerSection };
