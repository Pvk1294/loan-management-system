export const Role = {
  ADMIN: 'admin',
  SALES: 'sales',
  SANCTION: 'sanction',
  DISBURSEMENT: 'disbursement',
  COLLECTION: 'collection',
  BORROWER: 'borrower',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES: readonly Role[] = Object.values(Role);
