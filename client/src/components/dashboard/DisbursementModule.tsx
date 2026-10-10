'use client';

import { useState } from 'react';
import { Banknote, CalendarClock, CircleCheckBig, IndianRupee, Inbox } from 'lucide-react';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Column } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatDate, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan } from '@/types/api';
import { ConfirmModal, SummaryList } from './ConfirmModal';
import { LoanDetail } from './LoanDetail';
import { ModuleFigures } from './ModuleFigures';
import { ModuleLayout } from './ModuleLayout';
import { LoanModuleList } from './LoanModuleList';
import { PageHeader } from './PageHeader';
import { ApplicantCell, DateText, Money } from './loanCells';
import { useModuleLoans } from './useModuleLoans';

const daysFromNow = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString();

/**
 * Disbursement: release funds for sanctioned loans.
 *   Mark as disbursed → SANCTIONED becomes DISBURSED, the due date is set
 *   from the tenure, and the loan moves to Collection.
 */
export function DisbursementModule() {
  const toast = useToast();
  const loans = useModuleLoans('disbursement');
  const [viewing, setViewing] = useState<Loan | null>(null);
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
    ...(isQueue ? [] : [{ key: 'status', header: 'Status', mobile: 'aside', cell: (loan) => <LoanStatusBadge status={loan.status} /> } satisfies Column<Loan>]),
    { key: 'amount', header: isQueue ? 'To release' : 'Released', align: 'right', cell: (loan) => <Money amount={loan.principal} className="font-medium text-ink" /> },
    { key: 'tenure', header: 'Tenure', align: 'right', cell: (loan) => <span className="whitespace-nowrap text-ink-muted tabular-nums">{formatTenure(loan.tenureDays)}</span> },
    ...(isQueue
      ? [
          { key: 'sanctioned', header: 'Sanctioned', cell: (loan) => <DateText value={loan.sanctionedAt} /> } satisfies Column<Loan>,
          {
            key: 'action',
            header: '',
            align: 'right',
            mobile: 'footer',
            className: 'xl:hidden',
            cell: (loan) => (
              <Button
                variant="ink"
                size="sm"
                icon={<Banknote className="h-4 w-4" />}
                onClick={(event) => {
                  event.stopPropagation();
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
      <ModuleLayout
        header={<PageHeader title="Disbursement" description="Release funds for loans that have been sanctioned." />}
        list={
          <LoanModuleList
            loans={loans}
            columns={columns}
            onSelect={setViewing}
            selectedId={viewing?.id ?? null}
            labels={{ queue: 'Ready to disburse', history: 'Disbursed' }}
            emptyQueue={{ icon: CircleCheckBig, title: 'Nothing to disburse', description: 'Sanctioned loans appear here as soon as they are approved.' }}
            caption="Loans for disbursement"
            figures={
              <ModuleFigures
                figures={[
                  { label: 'Ready to disburse', value: loans.meta?.counts.queue, icon: Inbox, caption: 'sanctioned loans' },
                  { label: 'To be released', value: loans.meta?.totals.queuePrincipal, money: true, icon: IndianRupee, caption: 'across the queue' },
                  { label: 'Disbursed so far', value: loans.meta?.counts.history, icon: CalendarClock, caption: 'loans' },
                ]}
              />
            }
          />
        }
        detail={
          <LoanDetail
            loan={viewing}
            onClose={() => setViewing(null)}
            placeholder={{ title: 'Pick a loan', text: 'Its terms and the applicant will appear here, with the disbursement button below.' }}
            actions={
              viewing?.status === 'SANCTIONED' && (
                <Button variant="ink" icon={<Banknote className="h-4 w-4" />} onClick={() => setConfirming(viewing)}>
                  Mark as disbursed
                </Button>
              )
            }
          />
        }
      />

      <ConfirmModal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Disburse this loan?"
        description="Confirm the funds have been released. Repayment is counted from today."
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
