'use client';

import type { ReactNode } from 'react';
import { AccessDenied } from '@/components/AccessDenied';
import { useUser } from '@/components/auth/SessionGate';
import { Skeleton } from '@/components/ui/Spinner';
import { type ModuleKey, canAccessModule } from '@/lib/rbac';

/**
 * Renders a module only for roles that may use it. `proxy.ts` makes the same
 * decision on the server before the page loads; the API is the real guard.
 */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const user = useUser();
  if (!user) return <ModuleSkeleton />;
  return canAccessModule(user.role, module) ? children : <AccessDenied />;
}

function ModuleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading module">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="mt-6 h-72 w-full rounded-[20px]" />
    </div>
  );
}
