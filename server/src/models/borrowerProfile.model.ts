import { type HydratedDocument, Schema, type Types, model } from 'mongoose';
import { EMPLOYMENT_MODES, type EmploymentMode } from '../constants/loan';
import type { BreRuleCode } from '../services/bre';

export const BreStatus = {
  PASSED: 'PASSED',
  REJECTED: 'REJECTED',
} as const;

export type BreStatus = (typeof BreStatus)[keyof typeof BreStatus];

export interface ISalarySlip {
  /** Id of the file in the GridFS bucket. */
  fileId: Types.ObjectId;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface IBreOutcome {
  status: BreStatus;
  failures: { rule: BreRuleCode; message: string }[];
  evaluatedAt: Date;
  /** How many times the borrower has submitted their details. */
  attempts: number;
}

/**
 * Everything a borrower gives us before a loan exists: personal details, the
 * eligibility verdict and the salary slip. One profile per borrower.
 *
 * Keeping this apart from `users` leaves the auth collection small, and lets
 * the Sales module see how far each lead has got.
 */
export interface IBorrowerProfile {
  user: Types.ObjectId;
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  bre: IBreOutcome;
  salarySlip?: ISalarySlip;
  createdAt: Date;
  updatedAt: Date;
}

export const salarySlipSchema = new Schema<ISalarySlip>(
  {
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const breOutcomeSchema = new Schema<IBreOutcome>(
  {
    status: { type: String, enum: Object.values(BreStatus), required: true },
    failures: [
      {
        _id: false,
        rule: { type: String, required: true },
        message: { type: String, required: true },
      },
    ],
    evaluatedAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 1 },
  },
  { _id: false },
);

const borrowerProfileSchema = new Schema<IBorrowerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    pan: { type: String, required: true, trim: true, uppercase: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalary: { type: Number, required: true, min: 0 },
    employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
    bre: { type: breOutcomeSchema, required: true },
    salarySlip: { type: salarySlipSchema },
  },
  { timestamps: true },
);

export type BorrowerProfileDocument = HydratedDocument<IBorrowerProfile>;

export const BorrowerProfile = model<IBorrowerProfile>('BorrowerProfile', borrowerProfileSchema);
