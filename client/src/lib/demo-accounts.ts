import type { Role } from '@/types/api';

/**
 * The seeded accounts (server/src/scripts/seedAccounts.ts), offered as one-click
 * sign-ins on the login page so each role can be tried without typing.
 * Set NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false to hide them.
 */
export const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== 'false';

export interface DemoAccount {
  role: Role;
  label: string;
  sees: string;
  email: string;
  password: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { role: 'borrower', label: 'Borrower', sees: 'Apply for a loan and track it', email: 'borrower@lms.dev', password: 'Borrower@123' },
  { role: 'sales', label: 'Sales', sees: 'Leads who have not applied yet', email: 'sales@lms.dev', password: 'Sales@123' },
  { role: 'sanction', label: 'Sanction', sees: 'Approve or reject applications', email: 'sanction@lms.dev', password: 'Sanction@123' },
  { role: 'disbursement', label: 'Disbursement', sees: 'Release funds', email: 'disbursement@lms.dev', password: 'Disburse@123' },
  { role: 'collection', label: 'Collection', sees: 'Record repayments', email: 'collection@lms.dev', password: 'Collect@123' },
  { role: 'admin', label: 'Admin', sees: 'Every module', email: 'admin@lms.dev', password: 'Admin@123' },
];
