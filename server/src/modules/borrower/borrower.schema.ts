import { z } from 'zod';
import { EMPLOYMENT_MODES, LOAN_RULES } from '../../constants/loan';
import { normalizePan } from '../../services/bre';
import { parseDateOnly } from '../../utils/dates';
import { personNameSchema } from '../../utils/validation';

/**
 * Shape checks only: is every field present and of the right type?
 * Whether the applicant is *eligible* (age, salary, PAN format, employment) is
 * a business decision and is left to the rule engine, which answers with 422.
 */
export const profileSchema = z.object({
  fullName: personNameSchema,
  pan: z.string().min(1, 'PAN is required.').max(20).transform(normalizePan),
  dateOfBirth: z
    .string()
    .transform((value, ctx) => {
      const date = parseDateOnly(value);
      if (!date) {
        ctx.addIssue({ code: 'custom', message: 'Date of birth must be a real date in YYYY-MM-DD format.' });
        return z.NEVER;
      }
      return date;
    })
    .refine((date) => date.getTime() < Date.now(), 'Date of birth must be in the past.'),
  monthlySalary: z
    .number('Monthly salary must be a number.')
    .min(0, 'Monthly salary cannot be negative.')
    .max(100_000_000, 'Monthly salary looks too large.'),
  employmentMode: z.enum(EMPLOYMENT_MODES, 'Choose an employment mode.'),
});

export const loanApplicationSchema = z.object({
  amount: z
    .number('Loan amount must be a number.')
    .int('Loan amount must be a whole number of rupees.')
    .min(LOAN_RULES.MIN_AMOUNT, `Loan amount must be at least ₹${LOAN_RULES.MIN_AMOUNT}.`)
    .max(LOAN_RULES.MAX_AMOUNT, `Loan amount must be at most ₹${LOAN_RULES.MAX_AMOUNT}.`),
  tenureDays: z
    .number('Tenure must be a number.')
    .int('Tenure must be a whole number of days.')
    .min(LOAN_RULES.MIN_TENURE_DAYS, `Tenure must be at least ${LOAN_RULES.MIN_TENURE_DAYS} days.`)
    .max(LOAN_RULES.MAX_TENURE_DAYS, `Tenure must be at most ${LOAN_RULES.MAX_TENURE_DAYS} days.`),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;
