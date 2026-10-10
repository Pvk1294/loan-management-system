import type { BreRuleCode, EligibilityRules, EmploymentMode } from '@/types/api';
import { formatRupees } from './format';

/**
 * Eligibility hints shown while the borrower fills in the form.
 *
 * These repeat the server's Business Rule Engine so a problem is visible the
 * moment it is typed, without a round trip. They are hints only: the form
 * still submits, and the server's verdict is the one that counts. A browser
 * can be bypassed; the API cannot.
 */

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Which form field each rule is about, used to highlight the right input. */
export const RULE_FIELD: Record<BreRuleCode, 'dateOfBirth' | 'monthlySalary' | 'pan' | 'employmentMode'> = {
  AGE: 'dateOfBirth',
  SALARY: 'monthlySalary',
  PAN: 'pan',
  EMPLOYMENT: 'employmentMode',
};

/** Completed years between a YYYY-MM-DD date of birth and today. */
export function ageFromDateOfBirth(dateOfBirth: string, today: string): number | null {
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  const now = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!birth || !now) return null;
  const [by, bm, bd] = birth.slice(1).map(Number);
  const [ny, nm, nd] = now.slice(1).map(Number);
  const hadBirthday = nm > bm || (nm === bm && nd >= bd);
  return ny - by - (hadBirthday ? 0 : 1);
}

export interface EligibilityInput {
  pan: string;
  dateOfBirth: string;
  monthlySalary: string;
  employmentMode: EmploymentMode | '';
}

/** Returns a hint per rule that the current input would fail. Empty fields give no hint. */
export function eligibilityHints(
  input: EligibilityInput,
  rules: EligibilityRules,
  today: string,
): Partial<Record<BreRuleCode, string>> {
  const hints: Partial<Record<BreRuleCode, string>> = {};

  const age = input.dateOfBirth ? ageFromDateOfBirth(input.dateOfBirth, today) : null;
  if (age !== null && (age < rules.MIN_AGE || age > rules.MAX_AGE)) {
    hints.AGE = `Applicants must be between ${rules.MIN_AGE} and ${rules.MAX_AGE}. This date makes you ${age}.`;
  }

  const salary = Number(input.monthlySalary);
  if (input.monthlySalary !== '' && Number.isFinite(salary) && salary < rules.MIN_MONTHLY_SALARY) {
    hints.SALARY = `The minimum monthly salary is ${formatRupees(rules.MIN_MONTHLY_SALARY)}.`;
  }

  const pan = input.pan.trim().toUpperCase();
  if (pan.length > 0 && !PAN_REGEX.test(pan)) {
    hints.PAN = 'A PAN is 5 letters, 4 digits, then 1 letter, for example ABCDE1234F.';
  }

  if (input.employmentMode === 'UNEMPLOYED') {
    hints.EMPLOYMENT = 'Loans are currently offered to salaried and self-employed applicants only.';
  }

  return hints;
}
