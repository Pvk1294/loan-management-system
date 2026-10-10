'use client';

import { type FormEvent, useState } from 'react';
import { AlertTriangle, CircleCheckBig, HandCoins, IndianRupee, Inbox, PartyPopper } from 'lucide-react';
import { PaymentList } from '@/components/loan/PaymentList';
import { Alert } from '@/components/ui/Alert';
import { Badge, LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Dialog';
import { InputField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { ApiError, api, errorMessage } from '@/lib/api';
import { daysUntil, formatDate, formatRupeesExact, toIndiaDate, todayInIndia } from '@/lib/format';
import type { Loan, Payment } from '@/types/api';
import { DetailSection, LoanDetail } from './LoanDetail';
import { LoanModuleList } from './LoanModuleList';
import { ModuleFigures } from './ModuleFigures';
import { ModuleLayout } from './ModuleLayout';
import { PageHeader } from './PageHeader';
import { ApplicantCell, DateText, Money, OutstandingCell } from './loanCells';
import { useModuleLoans } from './useModuleLoans';

/**
 * Collection: record repayments on disbursed loans.
 *   Each payment needs a unique UTR, an amount and a date. When the amount paid
 *   reaches the total repayment, the server closes the loan automatically.
 */
export function CollectionModule() {
  const toast = useToast();
  const loans = useModuleLoans('collection');
  /** The loan open in the details drawer. */
  const [viewing, setViewing] = useState<Loan | null>(null);
  /** The loan a payment is being recorded for, from a row button or from the drawer. */
  const [paying, setPaying] = useState<Loan | null>(null);

  const onRecorded = (payment: Payment, loan: Loan) => {
    toast.success(
      loan.status === 'CLOSED'
        ? `${formatRupeesExact(payment.amount)} recorded. ${loan.reference} is repaid in full and has been closed.`
        : `${formatRupeesExact(payment.amount)} recorded. ${formatRupeesExact(loan.outstanding)} still outstanding.`,
    );
    setPaying(null);
    // Keep the drawer open on the updated loan, so the new balance and status are visible.
    if (viewing) setViewing(loan);
    loans.reload();
  };

  const isQueue = loans.view === 'queue';
  const columns: Column<Loan>[] = [
    { key: 'applicant', header: 'Applicant', mobile: 'title', cell: (loan) => <ApplicantCell loan={loan} /> },
    ...(isQueue
      ? []
      : [{ key: 'status', header: 'Status', mobile: 'aside', cell: (loan) => <LoanStatusBadge status={loan.status} /> } satisfies Column<Loan>]),
    { key: 'total', header: 'To repay', align: 'right', cell: (loan) => <Money amount={loan.totalRepayment} exact className="text-ink-muted" /> },
    ...(isQueue
      ? [
          { key: 'paid', header: 'Paid', align: 'right', cell: (loan) => <Money amount={loan.amountPaid} exact className="text-brand-700" /> } satisfies Column<Loan>,
          { key: 'outstanding', header: 'Outstanding', align: 'right', cell: (loan) => <OutstandingCell loan={loan} /> } satisfies Column<Loan>,
          { key: 'due', header: 'Due', cell: (loan) => <DueCell loan={loan} /> } satisfies Column<Loan>,
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
                icon={<HandCoins className="h-4 w-4" />}
                onClick={(event) => {
                  event.stopPropagation(); // the row itself opens the details drawer
                  setPaying(loan);
                }}
              >
                Record payment
              </Button>
            ),
          } satisfies Column<Loan>,
        ]
      : [
          { key: 'disbursed', header: 'Disbursed', cell: (loan) => <DateText value={loan.disbursedAt} /> } satisfies Column<Loan>,
          { key: 'closed', header: 'Closed', cell: (loan) => <DateText value={loan.closedAt} /> } satisfies Column<Loan>,
        ]),
  ];

  return (
    <>
      <ModuleLayout
        header={<PageHeader title="Collection" description="Record repayments. A loan closes itself once it is paid in full." />}
        list={
          <LoanModuleList
            loans={loans}
            columns={columns}
            onSelect={setViewing}
            selectedId={viewing?.id ?? null}
            labels={{ queue: 'Active loans', history: 'Closed' }}
            emptyQueue={{ icon: CircleCheckBig, title: 'No active loans', description: 'Disbursed loans appear here until they are repaid.' }}
            caption="Loans in collection"
            figures={
              <ModuleFigures
                figures={[
                  { label: 'Active loans', value: loans.meta?.counts.queue, icon: Inbox, caption: 'being repaid' },
                  { label: 'Outstanding', value: loans.meta?.totals.queueOutstanding, money: true, icon: IndianRupee, caption: 'still to collect' },
                  { label: 'Overdue', value: isQueue ? overdueCount(loans.loans) : undefined, icon: AlertTriangle, caption: 'past their due date' },
                ]}
              />
            }
          />
        }
        detail={
          <LoanDetail
            loan={viewing}
            onClose={() => setViewing(null)}
            placeholder={{ title: 'Pick a loan', text: 'Its balance, payments and history will appear here, with the payment button below.' }}
            actions={
              viewing?.status === 'DISBURSED' && (
                <Button variant="ink" icon={<HandCoins className="h-4 w-4" />} onClick={() => setPaying(viewing)}>
                  Record payment
                </Button>
              )
            }
          >
            {viewing && <PaymentLedger loan={viewing} />}
          </LoanDetail>
        }
      />

      <Modal
        open={paying !== null}
        onClose={() => setPaying(null)}
        title="Record a payment"
        description={paying && `${paying.applicant.fullName} · ${paying.reference}`}
      >
        {paying && <PaymentForm loan={paying} onCancel={() => setPaying(null)} onRecorded={onRecorded} />}
      </Modal>
    </>
  );
}

/** Loans on this page whose due date has passed. */
const overdueCount = (loans: Loan[] | undefined) =>
  loans ? loans.filter((loan) => loan.dueDate && daysUntil(loan.dueDate) < 0).length : undefined;

function DueCell({ loan }: { loan: Loan }) {
  if (!loan.dueDate) return <span className="text-ink-faint">—</span>;
  const daysLeft = daysUntil(loan.dueDate);
  return (
    <div className="flex flex-col items-start gap-1">
      <DateText value={loan.dueDate} />
      {daysLeft < 0 ? (
        <Badge tone="rose">{-daysLeft} days overdue</Badge>
      ) : daysLeft <= 7 ? (
        <Badge tone="amber">{daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}</Badge>
      ) : null}
    </div>
  );
}

/** The payments already recorded against a loan. Refetched whenever the amount paid changes. */
function PaymentLedger({ loan }: { loan: Loan }) {
  const { data } = useApiQuery(`collection-payments:${loan.id}:${loan.amountPaid}`, () =>
    api<{ payments: Payment[] }>(`/collection/loans/${loan.id}/payments`),
  );
  return (
    <DetailSection title="Payments">
      <PaymentList payments={data?.payments} emptyText="No payments recorded yet." />
    </DetailSection>
  );
}

const UTR_REGEX = /^[A-Z0-9]{12,22}$/;
const toPaise = (rupees: number) => Math.round(rupees * 100);

interface PaymentFormProps {
  loan: Loan;
  onCancel: () => void;
  onRecorded: (payment: Payment, loan: Loan) => void;
}

type PaymentField = 'utr' | 'amount' | 'paidAt';

/**
 * The checks here match the API's, so mistakes are caught as they are typed.
 * The API repeats every one of them, and alone enforces the two that need the
 * database: the UTR being unused, and no other payment landing at the same moment.
 */
function PaymentForm({ loan, onCancel, onRecorded }: PaymentFormProps) {
  const [today] = useState(todayInIndia);
  const disbursedOn = loan.disbursedAt ? toIndiaDate(loan.disbursedAt) : undefined;

  const [utr, setUtr] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(today);
  const [errors, setErrors] = useState<Partial<Record<PaymentField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amountNumber = Number(amount);
  const amountValid = amount !== '' && Number.isFinite(amountNumber) && amountNumber > 0;
  const remainingPaise = toPaise(loan.outstanding) - (amountValid ? toPaise(amountNumber) : 0);
  const clearsLoan = amountValid && remainingPaise === 0;

  const validate = (): Partial<Record<PaymentField, string>> => {
    const found: Partial<Record<PaymentField, string>> = {};

    if (!UTR_REGEX.test(utr.trim().toUpperCase())) found.utr = 'A UTR is 12 to 22 letters and digits, with no spaces.';

    if (!amountValid) found.amount = 'Enter an amount greater than zero.';
    else if (Math.abs(amountNumber * 100 - Math.round(amountNumber * 100)) > 1e-6) found.amount = 'Use at most two decimal places.';
    else if (remainingPaise < 0) found.amount = `This is more than the outstanding ${formatRupeesExact(loan.outstanding)}.`;

    if (!paidAt) found.paidAt = 'Enter the date the payment was made.';
    else if (paidAt > today) found.paidAt = 'The payment date cannot be in the future.';
    else if (disbursedOn && paidAt < disbursedOn) found.paidAt = `The loan was disbursed on ${formatDate(loan.disbursedAt)}.`;

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
      const result = await api<{ payment: Payment; loan: Loan }>(`/collection/loans/${loan.id}/payments`, {
        method: 'POST',
        body: { utr: utr.trim().toUpperCase(), amount: amountNumber, paidAt },
      });
      onRecorded(result.payment, result.loan);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_UTR') setErrors({ utr: err.message });
      else if (err instanceof ApiError && err.code === 'AMOUNT_EXCEEDS_OUTSTANDING') setErrors({ amount: err.message });
      else if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors);
      else setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-paper p-4 text-center">
        <div>
          <dt className="text-xs text-ink-muted">To repay</dt>
          <dd className="amount mt-1 text-base text-ink">{formatRupeesExact(loan.totalRepayment)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Paid</dt>
          <dd className="amount mt-1 text-base text-brand-700">{formatRupeesExact(loan.amountPaid)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Outstanding</dt>
          <dd className="amount mt-1 text-base text-ink">{formatRupeesExact(loan.outstanding)}</dd>
        </div>
      </dl>

      {formError && <Alert tone="error">{formError}</Alert>}

      <InputField
        label="UTR number"
        name="utr"
        placeholder="e.g. HDFCN52026101012345"
        autoComplete="off"
        spellCheck={false}
        autoFocus
        maxLength={22}
        className="font-mono tracking-wide uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
        value={utr}
        onChange={(event) => {
          setUtr(event.target.value.toUpperCase().replace(/\s/g, ''));
          setErrors((current) => ({ ...current, utr: undefined }));
        }}
        error={errors.utr}
        hint="The bank reference for the transfer. Each UTR can be used only once."
      />

      <div>
        <InputField
          label="Amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          prefix="₹"
          placeholder="0.00"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setErrors((current) => ({ ...current, amount: undefined }));
          }}
          error={errors.amount}
        />
        <button
          type="button"
          onClick={() => {
            setAmount(String(loan.outstanding));
            setErrors((current) => ({ ...current, amount: undefined }));
          }}
          className="mt-2 cursor-pointer rounded text-[13px] font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          Pay the full outstanding {formatRupeesExact(loan.outstanding)}
        </button>
      </div>

      <InputField
        label="Payment date"
        name="paidAt"
        type="date"
        min={disbursedOn}
        max={today}
        value={paidAt}
        onChange={(event) => {
          setPaidAt(event.target.value);
          setErrors((current) => ({ ...current, paidAt: undefined }));
        }}
        error={errors.paidAt}
      />

      {clearsLoan ? (
        <Alert tone="success" title="This payment clears the loan">
          <span className="inline-flex items-center gap-1.5">
            <PartyPopper className="h-4 w-4" aria-hidden="true" />
            It will be closed automatically.
          </span>
        </Alert>
      ) : (
        amountValid &&
        remainingPaise > 0 && (
          <p className="rounded-xl bg-paper px-3.5 py-2.5 text-sm text-ink-muted">
            Outstanding after this payment:{' '}
            <strong className="font-semibold text-ink tabular-nums">{formatRupeesExact(remainingPaise / 100)}</strong>
          </p>
        )
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="ink" loading={submitting}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
