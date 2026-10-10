import { LOAN_RULES } from '../constants/loan';
import { fromPaise, roundToPaise, toPaise } from '../utils/money';

export interface LoanQuote {
  principal: number;
  tenureDays: number;
  /** Percent per annum. */
  interestRate: number;
  interest: number;
  totalRepayment: number;
}

/**
 * Simple interest for a tenure given in days:
 *
 *   SI = (P × R × T) / (365 × 100)
 *
 * The result is rounded to the nearest paisa.
 */
export function calculateSimpleInterest(
  principal: number,
  annualRatePercent: number,
  tenureDays: number,
): number {
  return roundToPaise((principal * annualRatePercent * tenureDays) / (365 * 100));
}

export function buildLoanQuote(principal: number, tenureDays: number): LoanQuote {
  const interestRate = LOAN_RULES.ANNUAL_INTEREST_RATE;
  const interest = calculateSimpleInterest(principal, interestRate, tenureDays);
  return {
    principal,
    tenureDays,
    interestRate,
    interest,
    totalRepayment: fromPaise(toPaise(principal) + toPaise(interest)),
  };
}

/** What the borrower still owes, never below zero. */
export function outstandingBalance(totalRepayment: number, amountPaid: number): number {
  return fromPaise(Math.max(0, toPaise(totalRepayment) - toPaise(amountPaid)));
}
