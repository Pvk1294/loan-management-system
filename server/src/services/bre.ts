import { BRE_LIMITS, EmploymentMode } from '../constants/loan';
import { compareCalendarDates, istCalendarDate, utcCalendarDate } from '../utils/dates';

/**
 * Business Rule Engine (BRE): decides whether a borrower is eligible to apply.
 *
 * It runs on the server and is the only verdict that counts. The frontend
 * repeats the same checks to give instant feedback, but a request that skips
 * the browser still ends up here.
 *
 * The engine is a pure function: no database, no clock of its own (the caller
 * passes the date), which keeps it trivial to unit test.
 */

export type BreRuleCode = 'AGE' | 'SALARY' | 'PAN' | 'EMPLOYMENT';

export interface BreApplicant {
  pan: string;
  /** Date of birth as a date-only value (UTC midnight). */
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: EmploymentMode;
}

export interface BreFailure {
  rule: BreRuleCode;
  message: string;
}

export interface BreResult {
  eligible: boolean;
  failures: BreFailure[];
}

interface BreRule {
  code: BreRuleCode;
  /** Returns the reason for rejection, or null when the applicant passes. */
  check(applicant: BreApplicant, asOf: Date): string | null;
}

/**
 * PAN format: five letters, four digits, one letter (for example ABCDE1234F).
 *
 * A real PAN also encodes the holder type in its fourth letter (P for an
 * individual). That is deliberately not enforced here: the assignment asks for
 * the format check, and the commonly used sample PAN would fail the stricter rule.
 */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function normalizePan(pan: string): string {
  return pan.trim().toUpperCase();
}

/** Completed years between the date of birth and "today" in India. */
export function calculateAge(dateOfBirth: Date, asOf: Date = new Date()): number {
  const birth = utcCalendarDate(dateOfBirth);
  const today = istCalendarDate(asOf);
  const birthdayThisYear = { year: today.year, month: birth.month, day: birth.day };
  const hadBirthdayThisYear = compareCalendarDates(today, birthdayThisYear) >= 0;
  return today.year - birth.year - (hadBirthdayThisYear ? 0 : 1);
}

const rupees = new Intl.NumberFormat('en-IN');

const rules: readonly BreRule[] = [
  {
    code: 'AGE',
    check: ({ dateOfBirth }, asOf) => {
      const age = calculateAge(dateOfBirth, asOf);
      return age < BRE_LIMITS.MIN_AGE || age > BRE_LIMITS.MAX_AGE
        ? `Applicant must be between ${BRE_LIMITS.MIN_AGE} and ${BRE_LIMITS.MAX_AGE} years old (current age: ${age}).`
        : null;
    },
  },
  {
    code: 'SALARY',
    check: ({ monthlySalary }) =>
      monthlySalary < BRE_LIMITS.MIN_MONTHLY_SALARY
        ? `Monthly salary must be at least ₹${rupees.format(BRE_LIMITS.MIN_MONTHLY_SALARY)}.`
        : null,
  },
  {
    code: 'PAN',
    check: ({ pan }) =>
      PAN_REGEX.test(normalizePan(pan))
        ? null
        : 'PAN must be 5 letters, 4 digits and 1 letter, for example ABCDE1234F.',
  },
  {
    code: 'EMPLOYMENT',
    check: ({ employmentMode }) =>
      employmentMode === EmploymentMode.UNEMPLOYED
        ? 'Unemployed applicants are not eligible for a loan.'
        : null,
  },
];

/**
 * Runs every rule and reports all failures, not only the first, so the
 * borrower sees everything that needs attention in one go.
 */
export function evaluateBre(applicant: BreApplicant, asOf: Date = new Date()): BreResult {
  const failures: BreFailure[] = [];
  for (const rule of rules) {
    const message = rule.check(applicant, asOf);
    if (message) failures.push({ rule: rule.code, message });
  }
  return { eligible: failures.length === 0, failures };
}
