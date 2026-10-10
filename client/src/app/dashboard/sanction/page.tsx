import type { Metadata } from 'next';
import { ModuleGuard } from '@/components/dashboard/ModuleGuard';
import { SanctionModule } from '@/components/dashboard/SanctionModule';

export const metadata: Metadata = { title: 'Sanction' };

export default function SanctionPage() {
  return (
    <ModuleGuard module="sanction">
      <SanctionModule />
    </ModuleGuard>
  );
}
