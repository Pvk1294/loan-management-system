import { type HydratedDocument, Schema, type Types, model } from 'mongoose';
import {
  ACTIVE_LOAN_STATUSES,
  EMPLOYMENT_MODES,
  type EmploymentMode,
  LOAN_STATUSES,
  LoanStatus,
} from '../constants/loan';
import { type ISalarySlip, salarySlipSchema } from './borrowerProfile.model';

/** The borrower's details as they stood on the day they applied. */
export interface ILoanApplicant {
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: EmploymentMode;
}

export interface IStatusChange {
  status: LoanStatus;
  changedAt: Date;
  /** The user who caused the change. Absent only if that account is later removed. */
  changedBy?: Types.ObjectId;
  note?: string;
}

export interface ILoan {
  borrower: Types.ObjectId;
  /**
   * A snapshot, not a reference: a sanctioned loan must keep showing the
   * details it was sanctioned on even if the borrower edits their profile later.
   */
  applicant: ILoanApplicant;
  salarySlip: ISalarySlip;

  /** All amounts are rupees with at most two decimals. */
  principal: number;
  tenureDays: number;
  /** Percent per annum, fixed when the loan is created. */
  interestRate: number;
  interest: number;
  totalRepayment: number;
  /**
   * Running total of recorded payments. The `payments` collection is the
   * ledger; this figure is kept alongside it so the outstanding balance can be
   * read and guarded in a single atomic write.
   */
  amountPaid: number;

  status: LoanStatus;
  appliedAt: Date;
  sanctionedAt?: Date;
  sanctionedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  disbursedAt?: Date;
  disbursedBy?: Types.ObjectId;
  /** Disbursement date plus the tenure. */
  dueDate?: Date;
  closedAt?: Date;

  /** Audit trail of every status the loan has been through. */
  statusHistory: IStatusChange[];

  createdAt: Date;
  updatedAt: Date;
}

const applicantSchema = new Schema<ILoanApplicant>(
  {
    fullName: { type: String, required: true },
    pan: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalary: { type: Number, required: true },
    employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
  },
  { _id: false },
);

const statusChangeSchema = new Schema<IStatusChange>(
  {
    status: { type: String, enum: LOAN_STATUSES, required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { _id: false },
);

const loanSchema = new Schema<ILoan>(
  {
    borrower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    applicant: { type: applicantSchema, required: true },
    salarySlip: { type: salarySlipSchema, required: true },

    principal: { type: Number, required: true },
    tenureDays: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    interest: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },
    amountPaid: { type: Number, required: true, default: 0 },

    status: { type: String, enum: LOAN_STATUSES, required: true, default: LoanStatus.APPLIED },
    appliedAt: { type: Date, required: true },
    sanctionedAt: Date,
    sanctionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
    disbursedAt: Date,
    disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    closedAt: Date,

    statusHistory: { type: [statusChangeSchema], default: [] },
  },
  { timestamps: true },
);

// Each dashboard module lists loans by status, oldest or newest first.
loanSchema.index({ status: 1, appliedAt: 1 });

// One active loan per borrower, enforced by the database rather than by a
// read-then-write check, so a double click on "Apply" cannot create two loans.
loanSchema.index(
  { borrower: 1 },
  {
    unique: true,
    name: 'one_active_loan_per_borrower',
    partialFilterExpression: { status: { $in: [...ACTIVE_LOAN_STATUSES] } },
  },
);

// Loan history for a borrower.
loanSchema.index({ borrower: 1, appliedAt: -1 });

export type LoanDocument = HydratedDocument<ILoan>;

export const Loan = model<ILoan>('Loan', loanSchema);
