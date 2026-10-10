'use client';

import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/rbac';
import type { User } from '@/types/api';

interface UserMenuProps {
  user: User;
  /** `light` for dark backgrounds, `dark` for light ones. */
  tone?: 'light' | 'dark';
  className?: string;
}

/** Who is signed in, and the way out. */
export function UserMenu({ user, tone = 'dark', className }: UserMenuProps) {
  const light = tone === 'light';
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          light ? 'bg-white/10 text-white ring-1 ring-white/15' : 'bg-brand-100 text-brand-800',
        )}
        aria-hidden="true"
      >
        {initials(user.name)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className={cn('block truncate text-sm font-medium', light ? 'text-white' : 'text-slate-900')}>{user.name}</span>
        <span className={cn('block truncate text-xs', light ? 'text-white/50' : 'text-slate-500')}>{ROLE_LABELS[user.role]}</span>
      </span>
      <button
        type="button"
        onClick={logout}
        title="Sign out"
        aria-label="Sign out"
        className={cn(
          'cursor-pointer rounded-lg p-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand-500',
          light ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
