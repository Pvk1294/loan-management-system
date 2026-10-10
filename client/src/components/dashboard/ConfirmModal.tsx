'use client';

import { type ReactNode, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Dialog';
import { errorMessage } from '@/lib/api';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
  children?: ReactNode;
}

/** An "are you sure?" step for actions that change a loan's status and cannot be undone. */
export function ConfirmModal({ open, onClose, title, description, confirmLabel, tone = 'primary', onConfirm, children }: ConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (submitting) return;
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'ink'} onClick={confirm} loading={submitting}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {children}
      </div>
    </Modal>
  );
}

export function SummaryList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y divide-line rounded-2xl border border-line text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="text-right font-medium text-ink tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
