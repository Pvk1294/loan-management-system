'use client';

import { type FormEvent, useState } from 'react';
import { Check, CircleCheckBig, Clock3, IndianRupee, Inbox, X } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Dialog';
import { TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/api';
import { EMPLOYMENT_LABELS, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan } from '@/types/api';
import { ConfirmModal, SummaryList } from './ConfirmModal';
import { LoanDetail } from './LoanDetail';
import { ModuleFigures } from './ModuleFigures';
import { ModuleLayout } from './ModuleLayout';
import { LoanModuleList } from './LoanModuleList';
import { PageHeader } from './PageHeader';
import { ApplicantCell, DateText, Money } from './loanCells';
import { useModuleLoans } from './useModuleLoans';

const MIN_REASON_LENGTH = 5;

/** Days the oldest item in the queue has been waiting. */
const oldestWait = (loans: Loan[] | undefined) =>
  loans && loans.length > 0 ? Math.max(0, Math.floor((Date.now() - new Date(loans[0].appliedAt).getTime()) / 86_400_000)) : undefined;

/**
 * Sanction: review applied loans and approve or reject them.
 *   Approve → APPLIED becomes SANCTIONED and moves to Disbursement.
 *   Reject  → APPLIED becomes REJECTED, with a reason, and the loan ends there.
 */
export function SanctionModule() {
  const toast = useToast();
  const loans = useModuleLoans('sanction');
  const [selected, setSelected] = useState<Loan | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const finish = (message: string) => {
    toast.success(message);
    setAction(null);
    setSelected(null);
    loans.reload();
  };

  const approve = async () => {
    if (!selected) return;
    const { loan } = await api<{ loan: Loan }>(`/sanction/loans/${selected.id}/approve`, { method: 'POST' });
    finish(`${loan.reference} sanctioned. It is now with Disbursement.`);
  };

  const reject = async (reason: string) => {
    if (!selected) return;
    const { loan } = await api<{ loan: Loan }>(`/sanction/loans/${selected.id}/reject`, { method: 'POST', body: { reason } });
    finish(`${loan.reference} rejected.`);
  };

  const isQueue = loans.view === 'queue';
  const columns: Column<Loan>[] = [
    { key: 'applicant', header: 'Applicant', mobile: 'title', cell: (loan) => <ApplicantCell loan={loan} /> },
    ...(isQueue ? [] : [{ key: 'status', header: 'Status', mobile: 'aside', cell: (loan) => <LoanStatusBadge status={loan.status} /> } satisfies Column<Loan>]),
    {
      key: 'income',
      header: 'Income',
      cell: (loan) => (
        <div>
          <Money amount={loan.applicant.monthlySalary} className="text-ink" />
          <p className="text-xs text-ink-muted">{EMPLOYMENT_LABELS[loan.applicant.employmentMode]}</p>
        </div>
      ),
    },
    { key: 'amount', header: 'Requested', align: 'right', cell: (loan) => <Money amount={loan.principal} className="font-medium text-ink" /> },
    { key: 'tenure', header: 'Tenure', align: 'right', cell: (loan) => <span className="whitespace-nowrap text-ink-muted tabular-nums">{formatTenure(loan.tenureDays)}</span> },
    { key: 'applied', header: 'Applied', cell: (loan) => <DateText value={loan.appliedAt} /> },
    ...(isQueue
      ? [
          {
            key: 'action',
            header: '',
            align: 'right',
            mobile: 'footer',
            className: 'xl:hidden',
            cell: (loan) => (
              <Button variant="subtle" size="sm" onClick={() => setSelected(loan)}>
                Review
              </Button>
            ),
          } satisfies Column<Loan>,
        ]
      : []),
  ];

  return (
    <>
      <ModuleLayout
        header={<PageHeader title="Sanction" description="Review each application, then approve it or reject it with a reason." />}
        list={
          <LoanModuleList
            loans={loans}
            columns={columns}
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
            labels={{ queue: 'Awaiting review', history: 'Decided' }}
            emptyQueue={{ icon: CircleCheckBig, title: 'All caught up', description: 'There are no applications waiting for a decision.' }}
            caption="Loan applications"
            figures={
              <ModuleFigures
                figures={[
                  { label: 'Awaiting review', value: loans.meta?.counts.queue, icon: Inbox, caption: 'applications in the queue' },
                  { label: 'Amount requested', value: loans.meta?.totals.queuePrincipal, money: true, icon: IndianRupee, caption: 'across the queue' },
                  { label: 'Longest wait', value: isQueue ? oldestWait(loans.loans) : undefined, icon: Clock3, caption: 'days, oldest application' },
                ]}
              />
            }
          />
        }
        detail={
          <LoanDetail
            loan={selected}
            onClose={() => setSelected(null)}
            placeholder={{ title: 'Pick an application', text: 'Its details, salary slip and history will appear here, with the decision buttons below.' }}
            actions={
              selected?.status === 'APPLIED' && (
                <>
                  <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setAction('reject')} className="text-rose-700 hover:border-rose-300 hover:bg-rose-50">
                    Reject
                  </Button>
                  <Button variant="ink" icon={<Check className="h-4 w-4" />} onClick={() => setAction('approve')}>
                    Approve
                  </Button>
                </>
              )
            }
          />
        }
      />

      <ConfirmModal
        open={action === 'approve' && selected !== null}
        onClose={() => setAction(null)}
        title="Approve this loan?"
        description="It is sanctioned and passed to the Disbursement team."
        confirmLabel="Approve loan"
        onConfirm={approve}
      >
        {selected && (
          <SummaryList
            items={[
              ['Applicant', selected.applicant.fullName],
              ['Loan amount', formatRupees(selected.principal)],
              ['Tenure', formatTenure(selected.tenureDays)],
              ['Total repayment', formatRupeesExact(selected.totalRepayment)],
            ]}
          />
        )}
      </ConfirmModal>

      <Modal
        open={action === 'reject' && selected !== null}
        onClose={() => setAction(null)}
        title="Reject this application?"
        description={selected && `${selected.applicant.fullName} · ${formatRupees(selected.principal)} for ${formatTenure(selected.tenureDays)}`}
      >
        {selected && <RejectForm onClose={() => setAction(null)} onReject={reject} />}
      </Modal>
    </>
  );
}

/** Its own component so the reason starts empty each time the dialog opens. */
function RejectForm({ onClose, onReject }: { onClose: () => void; onReject: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON_LENGTH;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (tooShort) return;
    setSubmitting(true);
    setError(null);
    try {
      await onReject(trimmed);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <TextareaField
        label="Reason"
        placeholder="For example: income could not be verified from the salary slip."
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        autoFocus
        error={touched && tooShort ? `Give a reason of at least ${MIN_REASON_LENGTH} characters.` : undefined}
        hint="The borrower will see this. A rejection cannot be undone."
      />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" loading={submitting}>
          Reject application
        </Button>
      </div>
    </form>
  );
}
