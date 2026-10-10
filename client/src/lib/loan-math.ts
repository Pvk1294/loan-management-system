/**
 * The loan calculation shown live while the borrower moves the sliders.
 * It mirrors `server/src/services/loanMath.ts`. This copy is for display only:
 * when the borrower applies, the server works the figures out again and stores
 * its own result, so nothing calculated in the browser is ever trusted.
 */

const toPaise = (rupees: number): number => Math.round(rupees * 100);

export interface LoanQuote {
  principal: number;
  tenureDays: number;
  interestRate: number;
  interest: number;
  totalRepayment: number;
}

/** SI = (P × R × T) / (365 × 100), rounded to the nearest paisa. */
export function calculateSimpleInterest(principal: number, annualRatePercent: number, tenureDays: number): number {
  return toPaise((principal * annualRatePercent * tenureDays) / (365 * 100)) / 100;
}

export function buildLoanQuote(principal: number, tenureDays: number, interestRate: number): LoanQuote {
  const interest = calculateSimpleInterest(principal, interestRate, tenureDays);
  return {
    principal,
    tenureDays,
    interestRate,
    interest,
    totalRepayment: (toPaise(principal) + toPaise(interest)) / 100,
  };
}
