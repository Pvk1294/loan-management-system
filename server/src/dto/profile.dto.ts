import type { EmploymentMode } from '../constants/loan';
import type { BorrowerProfileDocument, BreStatus, ISalarySlip } from '../models/borrowerProfile.model';
import type { BreFailure } from '../services/bre';
import { calculateAge } from '../services/bre';

export interface SalarySlipDTO {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface ProfileDTO {
  fullName: string;
  pan: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  age: number;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  bre: {
    status: BreStatus;
    failures: BreFailure[];
    evaluatedAt: string;
    attempts: number;
  };
  salarySlip: SalarySlipDTO | null;
}

export const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

export function toSalarySlipDTO(slip: ISalarySlip): SalarySlipDTO {
  return {
    fileId: slip.fileId.toString(),
    filename: slip.filename,
    mimeType: slip.mimeType,
    size: slip.size,
    uploadedAt: slip.uploadedAt.toISOString(),
  };
}

export function toProfileDTO(profile: BorrowerProfileDocument): ProfileDTO {
  return {
    fullName: profile.fullName,
    pan: profile.pan,
    dateOfBirth: toDateOnly(profile.dateOfBirth),
    age: calculateAge(profile.dateOfBirth),
    monthlySalary: profile.monthlySalary,
    employmentMode: profile.employmentMode,
    bre: {
      status: profile.bre.status,
      failures: profile.bre.failures.map(({ rule, message }) => ({ rule, message })),
      evaluatedAt: profile.bre.evaluatedAt.toISOString(),
      attempts: profile.bre.attempts,
    },
    salarySlip: profile.salarySlip ? toSalarySlipDTO(profile.salarySlip) : null,
  };
}
