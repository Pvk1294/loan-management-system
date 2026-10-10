import type { Role } from '@/types/api';

/**
 * Who may see what on the frontend. The same policy is enforced again by the
 * API (server/src/routes.ts); this copy only decides what to show and where to
 * redirect, so nobody is offered a page they will be refused on.
 */

export type ModuleKey = 'sales' | 'sanction' | 'disbursement' | 'collection';

export interface DashboardModule {
  key: ModuleKey;
  label: string;
  href: string;
  description: string;
}

export const DASHBOARD_MODULES: readonly DashboardModule[] = [
  { key: 'sales', label: 'Sales', href: '/dashboard/sales', description: 'Leads who registered but have not applied yet' },
  { key: 'sanction', label: 'Sanction', href: '/dashboard/sanction', description: 'Review applications and approve or reject them' },
  { key: 'disbursement', label: 'Disbursement', href: '/dashboard/disbursement', description: 'Release funds for sanctioned loans' },
  { key: 'collection', label: 'Collection', href: '/dashboard/collection', description: 'Record repayments on active loans' },
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  sales: 'Sales Executive',
  sanction: 'Sanction Executive',
  disbursement: 'Disbursement Executive',
  collection: 'Collection Executive',
  borrower: 'Borrower',
};

export const BORROWER_HOME = '/apply';
export const LOGIN_PATH = '/login';

export const isStaff = (role: Role): boolean => role !== 'borrower';

/** Each executive sees only their own module; Admin sees all of them. */
export const canAccessModule = (role: Role, module: ModuleKey): boolean => role === 'admin' || role === module;

export const modulesFor = (role: Role): DashboardModule[] =>
  DASHBOARD_MODULES.filter((module) => canAccessModule(role, module.key));

/** Where a user lands after logging in. */
export function homePathFor(role: Role): string {
  return isStaff(role) ? (modulesFor(role)[0]?.href ?? LOGIN_PATH) : BORROWER_HOME;
}
