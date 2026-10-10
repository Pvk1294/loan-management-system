import { ReceiptText } from 'lucide-react';
import { formatDate, formatRupeesExact } from '@/lib/format';
import type { Payment } from '@/types/api';

interface PaymentListProps {
  payments: Payment[] | undefined;
  /** Shown when there are no payments yet. */
  emptyText: string;
}

/** The repayments recorded against a loan, oldest first. */
export function PaymentList({ payments, emptyText }: PaymentListProps) {
  if (!payments) {
    return <p className="py-3 text-sm text-slate-400">Loading payments…</p>;
  }
  if (payments.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3.5 text-sm text-slate-500">
        <ReceiptText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] text-slate-900">{payment.utr}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatDate(payment.paidAt)}
              {payment.recordedBy && ` · recorded by ${payment.recordedBy.name}`}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-emerald-700 tabular-nums">+{formatRupeesExact(payment.amount)}</p>
        </li>
      ))}
    </ul>
  );
}
