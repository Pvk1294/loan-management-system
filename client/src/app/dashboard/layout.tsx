import type { Metadata } from 'next';
import { SessionGate } from '@/components/auth/SessionGate';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = { title: { default: 'Dashboard', template: '%s · LMS' } };

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <SessionGate audience="staff">
      <DashboardShell>{children}</DashboardShell>
    </SessionGate>
  );
}
