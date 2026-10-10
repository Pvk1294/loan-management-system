import type { BreRuleCode } from '@/types/api';

/**
 * Whether a borrower qualifies is decided by the server's rule engine and
 * nowhere else. The browser checks only that fields are filled in and shaped
 * correctly; it does not know the lending rules, so they cannot be read off
 * the page or quietly drift out of step with the API.
 */

/** PAN format, a public standard: five letters, four digits, one letter. */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Which form field each server-side rule concerns, so a refusal can point at the right input. */
export const RULE_FIELD: Record<BreRuleCode, 'dateOfBirth' | 'monthlySalary' | 'pan' | 'employmentMode'> = {
  AGE: 'dateOfBirth',
  SALARY: 'monthlySalary',
  PAN: 'pan',
  EMPLOYMENT: 'employmentMode',
};
