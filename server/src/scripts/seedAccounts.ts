import { Role } from '../constants/roles';

export interface SeedAccount {
  name: string;
  email: string;
  password: string;
  role: Role;
}

/**
 * One account per role, with known credentials, so the system can be tested
 * immediately. These are demo credentials and are documented in the README.
 */
export const SEED_ACCOUNTS: readonly SeedAccount[] = [
  { name: 'Aditi Admin', email: 'admin@lms.dev', password: 'Admin@123', role: Role.ADMIN },
  { name: 'Sameer Sales', email: 'sales@lms.dev', password: 'Sales@123', role: Role.SALES },
  { name: 'Sana Sanction', email: 'sanction@lms.dev', password: 'Sanction@123', role: Role.SANCTION },
  { name: 'Dev Disbursement', email: 'disbursement@lms.dev', password: 'Disburse@123', role: Role.DISBURSEMENT },
  { name: 'Charu Collection', email: 'collection@lms.dev', password: 'Collect@123', role: Role.COLLECTION },
  { name: 'Bharat Borrower', email: 'borrower@lms.dev', password: 'Borrower@123', role: Role.BORROWER },
];
