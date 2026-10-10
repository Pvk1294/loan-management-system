import type { Metadata } from 'next';
import { ModuleGuard } from '@/components/dashboard/ModuleGuard';
import { SalesModule } from '@/components/dashboard/SalesModule';

export const metadata: Metadata = { title: 'Sales' };

export default function SalesPage() {
  return (
    <ModuleGuard module="sales">
      <SalesModule />
    </ModuleGuard>
  );
}
