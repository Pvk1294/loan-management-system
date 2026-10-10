'use client';

import { useState } from 'react';
import { Banknote, CircleCheckBig } from 'lucide-react';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Column } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatDate, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan } from '@/types/api';
import { ConfirmModal, SummaryList } from './ConfirmModal';
import { LoanDrawer } from './LoanDrawer';
import { LoanModuleList } from './LoanModuleList';
import { PageHeader } from './PageHeader';
import { ApplicantCell, DateText, Money } from './loanCells';
import { useModuleLoans } from './useModuleLoans';

/** The date `days` from now, for previewing a due date before the server sets the real one. */
const daysFromNow = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString();

/**
 * Disbursement: release funds for sanctioned loans.
 *   Mark as disbursed → SANCTIONED becomes DISBURSED, the due date is set from
 *   the tenure, and the loan moves to the Collection queue.
 */
export function DisbursementModule() {
  const toast = useToast();
  const loans = useModuleLoans('disbursement');
  /** The loan open in the details drawer. */
  const [viewing, setViewing] = useState<Loan | null>(null);
  /** The loan being disbursed, from a row button or from the drawer. */
  const [confirming, setConfirming] = useState<Loan | null>(null);

  const disburse = async () => {
    if (!confirming) return;
    const { loan } = await api<{ loan: Loan }>(`/disbursement/loans/${confirming.id}/disburse`, { method: 'POST' });
    toast.success(`${formatRupees(loan.principal)} disbursed for ${loan.reference}. It is now with Collection.`);
    setConfirming(null);
    setViewing(null);
    loans.reload();
  };

  const isQueue = loans.view === 'queue';
  const columns: Column<Loan>[] = [
    { key: 'applicant', header: 'Applicant', mobile: 'title', cell: (loan) => <ApplicantCell loan={loan} /> },
    ...(isQueue
      ? []
      : [{ key: 'status', header: 'Status', mobile: 'aside', cell: (loan) => <LoanStatusBadge status={loan.status} /> } satisfies Column<Loan>]),
    {
      key: 'amount',
      header: isQueue ? 'Amount to release' : 'Amount released',
      align: 'right',
      cell: (loan) => <Money amount={loan.principal} className="font-medium text-slate-900" />,
    },
    { key: 'tenure', header: 'Tenure', align: 'right', cell: (loan) => <span className="text-slate-600 tabular-nums">{formatTenure(loan.tenureDays)}</span> },
    { key: 'total', header: 'Repayment', align: 'right', cell: (loan) => <Money amount={loan.totalRepayment} exact className="text-slate-600" /> },
    ...(isQueue
      ? [
          { key: 'sanctioned', header: 'Sanctioned', cell: (loan) => <DateText value={loan.sanctionedAt} /> } satisfies Column<Loan>,
          {
            key: 'action',
            header: '',
            align: 'right',
            mobile: 'footer',
            cell: (loan) => (
              <Button
                size="sm"
                icon={<Banknote className="h-4 w-4" />}
                onClick={(event) => {
                  event.stopPropagation(); // the row itself opens the details drawer
                  setConfirming(loan);
                }}
              >
                Disburse
              </Button>
            ),
          } satisfies Column<Loan>,
        ]
      : [
          { key: 'disbursed', header: 'Disbursed', cell: (loan) => <DateText value={loan.disbursedAt} /> } satisfies Column<Loan>,
          { key: 'due', header: 'Due', cell: (loan) => <DateText value={loan.dueDate} /> } satisfies Column<Loan>,
        ]),
  ];

  return (
    <>
      <PageHeader title="Disbursement" description="Release funds for loans that have been sanctioned." />

      <LoanModuleList
        loans={loans}
        columns={columns}
        onSelect={setViewing}
        labels={{ queue: 'Ready to disburse', history: 'Disbursed' }}
        emptyQueue={{ icon: CircleCheckBig, title: 'Nothing to disburse', description: 'Sanctioned loans will appear here as soon as they are approved.' }}
        caption="Loans for disbursement"
      />

      <LoanDrawer
        loan={viewing}
        onClose={() => setViewing(null)}
        footer={
          viewing?.status === 'SANCTIONED' && (
            <Button icon={<Banknote className="h-4 w-4" />} onClick={() => setConfirming(viewing)}>
              Mark as disbursed
            </Button>
          )
        }
      />

      <ConfirmModal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Disburse this loan?"
        description="Confirm that the funds have been released to the borrower. Repayment is counted from today."
        confirmLabel="Mark as disbursed"
        onConfirm={disburse}
      >
        {confirming && (
          <SummaryList
            items={[
              ['Borrower', confirming.applicant.fullName],
              ['Amount to release', formatRupees(confirming.principal)],
              ['Repayment due', `${formatDate(daysFromNow(confirming.tenureDays))} (${formatTenure(confirming.tenureDays)})`],
              ['Amount to be repaid', formatRupeesExact(confirming.totalRepayment)],
            ]}
          />
        )}
      </ConfirmModal>
    </>
  );
}
