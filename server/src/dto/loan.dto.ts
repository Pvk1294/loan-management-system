import type { EmploymentMode, LoanStatus } from '../constants/loan';
import type { Role } from '../constants/roles';
import type { LoanDocument } from '../models/loan.model';
import type { PaymentDocument } from '../models/payment.model';
import { calculateAge } from '../services/bre';
import { outstandingBalance } from '../services/loanMath';
import { type SalarySlipDTO, toDateOnly, toSalarySlipDTO } from './profile.dto';

export interface StatusChangeDTO {
  status: LoanStatus;
  changedAt: string;
  note: string | null;
  /** Who made the change. Only included for staff. */
  changedBy?: { name: string; role: Role } | null;
}

export interface LoanDTO {
  id: string;
  /** Short human-friendly reference, for example LN-4F9A21C7. */
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
  salarySlip: SalarySlipDTO;
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
  statusHistory: StatusChangeDTO[];
}

export interface PaymentDTO {
  id: string;
  loanId: string;
  utr: string;
  amount: number;
  /** YYYY-MM-DD */
  paidAt: string;
  recordedBy?: { name: string } | null;
  createdAt: string;
}

/** A populated reference is a document; an unpopulated one is just an ObjectId. */
function populated<T extends object>(ref: unknown, key: keyof T & string): T | null {
  return typeof ref === 'object' && ref !== null && key in ref ? (ref as T) : null;
}

const iso = (date?: Date | null): string | null => (date ? date.toISOString() : null);

interface LoanDTOOptions {
  /** Staff see who made each status change; borrowers do not. */
  includeActors?: boolean;
}

export function toLoanDTO(loan: LoanDocument, { includeActors = false }: LoanDTOOptions = {}): LoanDTO {
  const borrower = populated<{ id: string; name: string; email: string }>(loan.borrower, 'email');

  return {
    id: loan.id,
    reference: `LN-${loan.id.slice(-8).toUpperCase()}`,
    status: loan.status,
    borrower: borrower
      ? { id: borrower.id, name: borrower.name, email: borrower.email }
      : { id: String(loan.borrower) },
    applicant: {
      fullName: loan.applicant.fullName,
      pan: loan.applicant.pan,
      dateOfBirth: toDateOnly(loan.applicant.dateOfBirth),
      age: calculateAge(loan.applicant.dateOfBirth, loan.appliedAt),
      monthlySalary: loan.applicant.monthlySalary,
      employmentMode: loan.applicant.employmentMode,
    },
    salarySlip: toSalarySlipDTO(loan.salarySlip),
    principal: loan.principal,
    tenureDays: loan.tenureDays,
    interestRate: loan.interestRate,
    interest: loan.interest,
    totalRepayment: loan.totalRepayment,
    amountPaid: loan.amountPaid,
    outstanding: outstandingBalance(loan.totalRepayment, loan.amountPaid),
    appliedAt: loan.appliedAt.toISOString(),
    sanctionedAt: iso(loan.sanctionedAt),
    rejectedAt: iso(loan.rejectedAt),
    rejectionReason: loan.rejectionReason ?? null,
    disbursedAt: iso(loan.disbursedAt),
    dueDate: iso(loan.dueDate),
    closedAt: iso(loan.closedAt),
    statusHistory: loan.statusHistory.map((change) => {
      const actor = populated<{ name: string; role: Role }>(change.changedBy, 'name');
      return {
        status: change.status,
        changedAt: change.changedAt.toISOString(),
        note: change.note ?? null,
        ...(includeActors && { changedBy: actor ? { name: actor.name, role: actor.role } : null }),
      };
    }),
  };
}

export function toPaymentDTO(payment: PaymentDocument): PaymentDTO {
  const recordedBy = populated<{ name: string }>(payment.recordedBy, 'name');
  return {
    id: payment.id,
    loanId: String(payment.loan),
    utr: payment.utr,
    amount: payment.amount,
    paidAt: toDateOnly(payment.paidAt),
    ...(recordedBy && { recordedBy: { name: recordedBy.name } }),
    createdAt: payment.createdAt.toISOString(),
  };
}
