import type { Metadata } from 'next';
import { ModuleGuard } from '@/components/dashboard/ModuleGuard';
import { DisbursementModule } from '@/components/dashboard/DisbursementModule';

export const metadata: Metadata = { title: 'Disbursement' };

export default function DisbursementPage() {
  return (
    <ModuleGuard module="disbursement">
      <DisbursementModule />
    </ModuleGuard>
  );
}
