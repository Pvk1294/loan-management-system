'use client';

import type { ReactNode } from 'react';
import { AccessDenied } from '@/components/AccessDenied';
import { Skeleton } from '@/components/ui/Spinner';
import { useUser } from '@/components/auth/SessionGate';
import { type ModuleKey, canAccessModule } from '@/lib/rbac';

/**
 * Renders a module only for roles that may use it. `proxy.ts` makes the same
 * decision on the server before the page loads; this covers client-side
 * navigation and is the last line on the frontend. The API is the real guard.
 *
 * The module itself is mounted only once the user is known, so none of its
 * requests can leave without a token.
 */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const user = useUser();
  if (!user) return <ModuleSkeleton />;
  return canAccessModule(user.role, module) ? children : <AccessDenied />;
}

/** The outline of a module page, shown for the instant before the session is read. */
function ModuleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading module">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <Skeleton className="mt-8 h-10 w-64" />
      <Skeleton className="mt-4 h-72 w-full rounded-2xl" />
    </div>
  );
}
