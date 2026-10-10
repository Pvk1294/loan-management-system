'use client';

import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/rbac';
import type { User } from '@/types/api';

interface UserMenuProps {
  user: User;
  tone?: 'light' | 'dark';
  className?: string;
}

export function UserMenu({ user, tone = 'dark', className }: UserMenuProps) {
  const light = tone === 'light';
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          light ? 'bg-paper/10 text-paper ring-1 ring-paper/15' : 'bg-ink text-paper',
        )}
        aria-hidden="true"
      >
        {initials(user.name)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className={cn('block truncate text-sm font-medium', light ? 'text-paper' : 'text-ink')}>{user.name}</span>
        <span className={cn('block truncate text-xs', light ? 'text-paper/50' : 'text-ink-muted')}>{ROLE_LABELS[user.role]}</span>
      </span>
      <button
        type="button"
        onClick={logout}
        title="Sign out"
        aria-label="Sign out"
        className={cn(
          'cursor-pointer rounded-lg p-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand-500',
          light ? 'text-paper/55 hover:bg-paper/10 hover:text-paper' : 'text-ink-faint hover:bg-paper-2 hover:text-ink',
        )}
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
