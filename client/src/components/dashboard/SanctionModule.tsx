'use client';

import { type FormEvent, useState } from 'react';
import { Check, CircleCheckBig, X } from 'lucide-react';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import type { Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Dialog';
import { TextareaField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/api';
import { EMPLOYMENT_LABELS, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan } from '@/types/api';
import { ConfirmModal, SummaryList } from './ConfirmModal';
import { LoanDrawer } from './LoanDrawer';
import { LoanModuleList } from './LoanModuleList';
import { PageHeader } from './PageHeader';
import { ApplicantCell, DateText, Money } from './loanCells';
import { useModuleLoans } from './useModuleLoans';

const MIN_REASON_LENGTH = 5;

/**
 * Sanction: review applied loans and approve or reject them.
 *   Approve → APPLIED becomes SANCTIONED and moves to the Disbursement queue.
 *   Reject  → APPLIED becomes REJECTED (a reason is required) and the loan ends there.
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
    ...(isQueue
      ? []
      : [{ key: 'status', header: 'Status', mobile: 'aside', cell: (loan) => <LoanStatusBadge status={loan.status} /> } satisfies Column<Loan>]),
    {
      key: 'income',
      header: 'Monthly income',
      cell: (loan) => (
        <div>
          <Money amount={loan.applicant.monthlySalary} className="text-slate-900" />
          <p className="text-xs text-slate-500">{EMPLOYMENT_LABELS[loan.applicant.employmentMode]}</p>
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', cell: (loan) => <Money amount={loan.principal} className="font-medium text-slate-900" /> },
    { key: 'tenure', header: 'Tenure', align: 'right', cell: (loan) => <span className="text-slate-600 tabular-nums">{formatTenure(loan.tenureDays)}</span> },
    { key: 'total', header: 'Repayment', align: 'right', cell: (loan) => <Money amount={loan.totalRepayment} exact className="text-slate-600" /> },
    { key: 'applied', header: 'Applied', cell: (loan) => <DateText value={loan.appliedAt} /> },
    ...(isQueue
      ? [
          {
            key: 'action',
            header: '',
            align: 'right',
            mobile: 'footer',
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
      <PageHeader title="Sanction" description="Review each application, then approve it or reject it with a reason." />

      <LoanModuleList
        loans={loans}
        columns={columns}
        onSelect={setSelected}
        labels={{ queue: 'Awaiting review', history: 'Decided' }}
        emptyQueue={{ icon: CircleCheckBig, title: 'All caught up', description: 'There are no applications waiting for a decision.' }}
        caption="Loan applications"
      />

      <LoanDrawer
        loan={selected}
        onClose={() => setSelected(null)}
        footer={
          selected?.status === 'APPLIED' && (
            <>
              <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setAction('reject')} className="text-rose-700 hover:border-rose-300 hover:bg-rose-50">
                Reject
              </Button>
              <Button icon={<Check className="h-4 w-4" />} onClick={() => setAction('approve')}>
                Approve loan
              </Button>
            </>
          )
        }
      />

      <ConfirmModal
        open={action === 'approve' && selected !== null}
        onClose={() => setAction(null)}
        title="Approve this loan?"
        description="The loan is sanctioned and passed to the Disbursement team."
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

      <RejectModal
        loan={action === 'reject' ? selected : null}
        onClose={() => setAction(null)}
        onReject={reject}
      />
    </>
  );
}

interface RejectModalProps {
  loan: Loan | null;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
}

function RejectModal({ loan, onClose, onReject }: RejectModalProps) {
  return (
    <Modal
      open={loan !== null}
      onClose={onClose}
      title="Reject this application?"
      description={loan && `${loan.applicant.fullName} · ${formatRupees(loan.principal)} for ${formatTenure(loan.tenureDays)}`}
    >
      {loan && <RejectForm onClose={onClose} onReject={onReject} />}
    </Modal>
  );
}

/** Kept as its own component so the reason starts empty each time the dialog opens. */
function RejectForm({ onClose, onReject }: Omit<RejectModalProps, 'loan'>) {
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
        label="Reason for rejection"
        placeholder="For example: income could not be verified from the salary slip."
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        autoFocus
        error={touched && tooShort ? `Give a reason of at least ${MIN_REASON_LENGTH} characters.` : undefined}
        hint="The borrower will see this reason. A rejection cannot be undone."
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
