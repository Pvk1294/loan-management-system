import { describe, expect, it } from 'vitest';
import { buildLoanQuote, calculateSimpleInterest, outstandingBalance } from '../../src/services/loanMath';
import { hasAtMostTwoDecimals, toPaise } from '../../src/utils/money';

describe('simple interest: SI = (P × R × T) / (365 × 100)', () => {
  it.each([
    // principal, rate, days, expected interest
    [100_000, 12, 90, 2958.9],
    [50_000, 12, 30, 493.15],
    [500_000, 12, 365, 60_000],
    [75_000, 12, 45, 1109.59],
    [50_000, 12, 365, 6000],
  ])('₹%d at %d%% for %d days is ₹%d', (principal, rate, days, expected) => {
    expect(calculateSimpleInterest(principal, rate, days)).toBe(expected);
  });

  it('rounds to the nearest paisa', () => {
    // 123457 × 12 × 47 / 36500 = 1907.6642...
    expect(calculateSimpleInterest(123_457, 12, 47)).toBe(1907.66);
  });
});

describe('loan quote', () => {
  it('uses the fixed 12% rate and adds interest to the principal', () => {
    expect(buildLoanQuote(100_000, 90)).toEqual({
      principal: 100_000,
      tenureDays: 90,
      interestRate: 12,
      interest: 2958.9,
      totalRepayment: 102_958.9,
    });
  });

  it('gives the smallest and largest loans the expected totals', () => {
    expect(buildLoanQuote(50_000, 30).totalRepayment).toBe(50_493.15);
    expect(buildLoanQuote(500_000, 365).totalRepayment).toBe(560_000);
  });
});

describe('outstanding balance', () => {
  it('is the total repayment minus what has been paid', () => {
    expect(outstandingBalance(102_958.9, 40_000)).toBe(62_958.9);
  });

  it('is exactly zero when paid in full, despite floating point', () => {
    // 0.1 + 0.2 !== 0.3 in floating point; in paise it is 10 + 20 === 30.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(outstandingBalance(0.3, 0.1 + 0.2)).toBe(0);
    expect(outstandingBalance(50_493.15, 25_000 + 25_493.15)).toBe(0);
  });

  it('never goes below zero', () => {
    expect(outstandingBalance(100, 150)).toBe(0);
  });
});

describe('money helpers', () => {
  it('converts rupees to whole paise', () => {
    expect(toPaise(2958.9)).toBe(295_890);
    expect(toPaise(0.07)).toBe(7);
  });

  it('accepts at most two decimal places', () => {
    expect(hasAtMostTwoDecimals(100)).toBe(true);
    expect(hasAtMostTwoDecimals(100.5)).toBe(true);
    expect(hasAtMostTwoDecimals(100.55)).toBe(true);
    expect(hasAtMostTwoDecimals(100.555)).toBe(false);
    expect(hasAtMostTwoDecimals(Number.NaN)).toBe(false);
  });
});
