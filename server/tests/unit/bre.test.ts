import { describe, expect, it } from 'vitest';
import { EmploymentMode } from '../../src/constants/loan';
import { type BreApplicant, PAN_REGEX, calculateAge, evaluateBre } from '../../src/services/bre';

/** "Today" for every test: 15 June 2026, midday in India. */
const TODAY = new Date('2026-06-15T06:30:00.000Z');

const dob = (value: string) => new Date(`${value}T00:00:00.000Z`);

const eligible: BreApplicant = {
  pan: 'ABCDE1234F',
  dateOfBirth: dob('1995-04-10'),
  monthlySalary: 60_000,
  employmentMode: EmploymentMode.SALARIED,
};

const failedRules = (overrides: Partial<BreApplicant>) =>
  evaluateBre({ ...eligible, ...overrides }, TODAY).failures.map((failure) => failure.rule);

describe('BRE', () => {
  it('passes an applicant who meets every rule', () => {
    expect(evaluateBre(eligible, TODAY)).toEqual({ eligible: true, failures: [] });
  });

  describe('age: must be between 23 and 50', () => {
    it.each([
      ['turns 23 today', '2003-06-15', []],
      ['turns 23 tomorrow, so is still 22', '2003-06-16', ['AGE']],
      ['is 50 and turns 51 tomorrow', '1975-06-16', []],
      ['turns 51 today', '1975-06-15', ['AGE']],
      ['is 18', '2008-01-01', ['AGE']],
      ['is 65', '1961-01-01', ['AGE']],
    ])('an applicant who %s', (_label, dateOfBirth, expected) => {
      expect(failedRules({ dateOfBirth: dob(dateOfBirth) })).toEqual(expected);
    });

    it('uses the date in India, not the server timezone', () => {
      // 19:00 UTC on 1 Jan is already 00:30 on 2 Jan in India.
      const lateEveningUtc = new Date('2026-01-01T19:00:00.000Z');
      expect(calculateAge(dob('2003-01-02'), lateEveningUtc)).toBe(23);
      expect(calculateAge(dob('2003-01-03'), lateEveningUtc)).toBe(22);
    });

    it('handles a 29 February birthday in a non-leap year', () => {
      expect(calculateAge(dob('2000-02-29'), new Date('2026-02-28T06:30:00.000Z'))).toBe(25);
      expect(calculateAge(dob('2000-02-29'), new Date('2026-03-01T06:30:00.000Z'))).toBe(26);
    });
  });

  describe('salary: at least ₹25,000 a month', () => {
    it.each([
      [24_999.99, ['SALARY']],
      [25_000, []],
      [0, ['SALARY']],
    ])('₹%d', (monthlySalary, expected) => {
      expect(failedRules({ monthlySalary })).toEqual(expected);
    });
  });

  describe('PAN: 5 letters, 4 digits, 1 letter', () => {
    it.each(['ABCDE1234F', 'ZZZZZ9999Z', 'abcde1234f', '  ABCDE1234F  '])('accepts %j', (pan) => {
      expect(failedRules({ pan })).toEqual([]);
    });

    it.each(['', 'ABCD1234F', 'ABCDE12345', 'ABCDE1234FF', '12345ABCDE', 'ABCDE-1234F', 'ABCDE 1234F'])(
      'rejects %j',
      (pan) => {
        expect(failedRules({ pan })).toEqual(['PAN']);
      },
    );

    it('is anchored, so a valid PAN inside a longer string does not match', () => {
      expect(PAN_REGEX.test('XXABCDE1234FXX')).toBe(false);
    });
  });

  describe('employment: unemployed applicants are rejected', () => {
    it.each([
      [EmploymentMode.SALARIED, []],
      [EmploymentMode.SELF_EMPLOYED, []],
      [EmploymentMode.UNEMPLOYED, ['EMPLOYMENT']],
    ])('%s', (employmentMode, expected) => {
      expect(failedRules({ employmentMode })).toEqual(expected);
    });
  });

  it('reports every failed rule at once, each with a readable message', () => {
    const result = evaluateBre(
      {
        pan: 'NOT-A-PAN',
        dateOfBirth: dob('2010-01-01'),
        monthlySalary: 10_000,
        employmentMode: EmploymentMode.UNEMPLOYED,
      },
      TODAY,
    );

    expect(result.eligible).toBe(false);
    expect(result.failures.map((failure) => failure.rule)).toEqual(['AGE', 'SALARY', 'PAN', 'EMPLOYMENT']);
    for (const failure of result.failures) {
      expect(failure.message.length).toBeGreaterThan(10);
    }
  });
});
