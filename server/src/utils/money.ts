/**
 * Money helpers.
 *
 * Amounts are stored and sent over the API in rupees with at most two decimals,
 * but every sum, difference and comparison is done in whole paise. Floating
 * point cannot represent values like 0.1 exactly, so comparing rupee totals
 * directly could leave a loan one paisa short of closing.
 */

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

export const fromPaise = (paise: number): number => paise / 100;

/** Rounds a rupee amount to the nearest paisa. */
export const roundToPaise = (rupees: number): number => fromPaise(toPaise(rupees));

export const hasAtMostTwoDecimals = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
