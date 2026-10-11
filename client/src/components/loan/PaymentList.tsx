import type { CSSProperties } from 'react';
import { ReceiptText } from 'lucide-react';
import { formatDate, formatRupeesExact } from '@/lib/format';
import type { Payment } from '@/types/api';

interface PaymentListProps {
  payments: Payment[] | undefined;
  emptyText: string;
}

export function PaymentList({ payments, emptyText }: PaymentListProps) {
  if (!payments) return <p className="py-3 text-sm text-ink-faint">Loading payments…</p>;
  if (payments.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-paper px-4 py-3.5 text-sm text-ink-muted">
        <ReceiptText className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {payments.map((payment, i) => (
        <li key={payment.id} className="reveal-fade flex items-center justify-between gap-4 px-4 py-3" style={{ '--i': i } as CSSProperties}>
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] text-ink">{payment.utr}</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {formatDate(payment.paidAt)}
              {payment.recordedBy && ` · by ${payment.recordedBy.name}`}
            </p>
          </div>
          <p className="amount shrink-0 text-base text-brand-700">+{formatRupeesExact(payment.amount)}</p>
        </li>
      ))}
    </ul>
  );
}
