'use client';

import { useUser } from '@/components/auth/SessionGate';
import { Brand } from '@/components/Brand';
import { Skeleton } from '@/components/ui/Spinner';
import { UserMenu } from '@/components/UserMenu';

export function BorrowerHeader() {
  const user = useUser();
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <Brand />
        {user ? <UserMenu user={user} className="min-w-0" /> : <Skeleton className="h-9 w-40" />}
      </div>
    </header>
  );
}
