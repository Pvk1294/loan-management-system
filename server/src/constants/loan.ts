export const LoanStatus = {
  APPLIED: 'APPLIED',
  SANCTIONED: 'SANCTIONED',
  REJECTED: 'REJECTED',
  DISBURSED: 'DISBURSED',
  CLOSED: 'CLOSED',
} as const;

export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export const LOAN_STATUSES: readonly LoanStatus[] = Object.values(LoanStatus);

/**
 * The loan state machine: for each status, the statuses it may move to.
 *
 *   APPLIED ──► SANCTIONED ──► DISBURSED ──► CLOSED
 *      └──────► REJECTED
 *
 * REJECTED and CLOSED are terminal. Every status change in the code base goes
 * through `transitionLoan`, which refuses anything not listed here.
 */
export const LOAN_TRANSITIONS: Readonly<Record<LoanStatus, readonly LoanStatus[]>> = {
  APPLIED: [LoanStatus.SANCTIONED, LoanStatus.REJECTED],
  SANCTIONED: [LoanStatus.DISBURSED],
  DISBURSED: [LoanStatus.CLOSED],
  REJECTED: [],
  CLOSED: [],
};

/** A borrower may hold only one loan in any of these statuses at a time. */
export const ACTIVE_LOAN_STATUSES: readonly LoanStatus[] = [
  LoanStatus.APPLIED,
  LoanStatus.SANCTIONED,
  LoanStatus.DISBURSED,
];

export const LOAN_RULES = {
  MIN_AMOUNT: 50_000,
  MAX_AMOUNT: 500_000,
  MIN_TENURE_DAYS: 30,
  MAX_TENURE_DAYS: 365,
  /** Fixed rate, percent per annum, simple interest. */
  ANNUAL_INTEREST_RATE: 12,
} as const;

export const EmploymentMode = {
  SALARIED: 'SALARIED',
  SELF_EMPLOYED: 'SELF_EMPLOYED',
  UNEMPLOYED: 'UNEMPLOYED',
} as const;

export type EmploymentMode = (typeof EmploymentMode)[keyof typeof EmploymentMode];

export const EMPLOYMENT_MODES: readonly EmploymentMode[] = Object.values(EmploymentMode);

export const BRE_LIMITS = {
  MIN_AGE: 23,
  MAX_AGE: 50,
  MIN_MONTHLY_SALARY: 25_000,
} as const;

export const SALARY_SLIP = {
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;
