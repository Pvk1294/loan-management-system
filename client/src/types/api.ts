/**
 * Shapes of the data the API sends and receives. These mirror the DTOs in
 * `server/src/dto`; the server remains the source of truth.
 */

export type Role = 'admin' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'borrower';

export type LoanStatus = 'APPLIED' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';

export type EmploymentMode = 'SALARIED' | 'SELF_EMPLOYED' | 'UNEMPLOYED';

export type BreRuleCode = 'AGE' | 'SALARY' | 'PAN' | 'EMPLOYMENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface BreFailure {
  rule: BreRuleCode;
  message: string;
}

export interface SalarySlip {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Profile {
  fullName: string;
  pan: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  age: number;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  bre: {
    status: 'PASSED' | 'REJECTED';
    failures: BreFailure[];
    evaluatedAt: string;
    attempts: number;
  };
  salarySlip: SalarySlip | null;
}

export interface StatusChange {
  status: LoanStatus;
  changedAt: string;
  note: string | null;
  changedBy?: { name: string; role: Role } | null;
}

export interface Loan {
  id: string;
  reference: string;
  status: LoanStatus;
  borrower: { id: string; name?: string; email?: string };
  applicant: {
    fullName: string;
    pan: string;
    dateOfBirth: string;
    age: number;
    monthlySalary: number;
    employmentMode: EmploymentMode;
  };
  salarySlip: SalarySlip;
  principal: number;
  tenureDays: number;
  interestRate: number;
  interest: number;
  totalRepayment: number;
  amountPaid: number;
  outstanding: number;
  appliedAt: string;
  sanctionedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  disbursedAt: string | null;
  dueDate: string | null;
  closedAt: string | null;
  statusHistory: StatusChange[];
}

export interface Payment {
  id: string;
  loanId: string;
  utr: string;
  amount: number;
  /** YYYY-MM-DD */
  paidAt: string;
  recordedBy?: { name: string } | null;
  createdAt: string;
}

export interface LoanRules {
  MIN_AMOUNT: number;
  MAX_AMOUNT: number;
  MIN_TENURE_DAYS: number;
  MAX_TENURE_DAYS: number;
  ANNUAL_INTEREST_RATE: number;
}

export interface EligibilityRules {
  MIN_AGE: number;
  MAX_AGE: number;
  MIN_MONTHLY_SALARY: number;
}

export type ApplicationStep = 'PERSONAL_DETAILS' | 'SALARY_SLIP' | 'LOAN_CONFIG' | 'TRACKING';

export interface ApplicationOverview {
  nextStep: ApplicationStep;
  profile: Profile | null;
  activeLoan: Loan | null;
  loans: Loan[];
  rules: {
    loan: LoanRules;
    eligibility: EligibilityRules;
    salarySlip: { maxSizeBytes: number; allowedMimeTypes: string[] };
  };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ModuleView = 'queue' | 'history';

export interface ModuleLoanMeta extends PageMeta {
  counts: Record<ModuleView, number>;
  totals: { queuePrincipal: number; queueOutstanding: number };
}

export type LeadStage = 'REGISTERED' | 'NOT_ELIGIBLE' | 'ELIGIBLE' | 'READY_TO_APPLY';

export interface Lead {
  id: string;
  name: string;
  email: string;
  stage: LeadStage;
  registeredAt: string;
  lastActivityAt: string;
  profile: {
    fullName: string;
    monthlySalary: number;
    employmentMode: EmploymentMode;
    eligibilityAttempts: number;
    rejectionReasons: BreFailure[];
    salarySlipUploaded: boolean;
  } | null;
}

export interface LeadMeta extends PageMeta {
  counts: Record<LeadStage, number> & { total: number };
}
