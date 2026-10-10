import type { EmploymentMode, LeadStage, LoanStatus } from '@/types/api';

const INDIA = 'en-IN';
const IST = 'Asia/Kolkata';

const wholeRupees = new Intl.NumberFormat(INDIA, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const exactRupees = new Intl.NumberFormat(INDIA, {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plainNumber = new Intl.NumberFormat(INDIA, { maximumFractionDigits: 2 });

const dateFormat = new Intl.DateTimeFormat(INDIA, { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });
const dateTimeFormat = new Intl.DateTimeFormat(INDIA, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: IST,
});

/** ₹1,00,000 — for round figures such as principal and salary. */
export const formatRupees = (amount: number): string => wholeRupees.format(amount);

/** ₹1,02,958.90 — for calculated amounts, always to the paisa. */
export const formatRupeesExact = (amount: number): string => exactRupees.format(amount);

export const formatNumber = (value: number): string => plainNumber.format(value);

/** ₹50K, ₹1L, ₹2.5L — short labels for slider ticks. */
export function formatRupeesShort(amount: number): string {
  if (amount >= 100_000) return `₹${plainNumber.format(amount / 100_000)}L`;
  if (amount >= 1000) return `₹${plainNumber.format(amount / 1000)}K`;
  return `₹${amount}`;
}

export const formatDate = (iso: string | null | undefined): string => (iso ? dateFormat.format(new Date(iso)) : '—');

export const formatDateTime = (iso: string | null | undefined): string =>
  iso ? dateTimeFormat.format(new Date(iso)) : '—';

/** Today's date in India as YYYY-MM-DD, the format date inputs and the API use. */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date());
}

/** The calendar date in India of an instant, as YYYY-MM-DD. */
export function toIndiaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date(iso));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTenure(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Whole days from now until a date; negative once it has passed. */
export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const EMPLOYMENT_LABELS: Record<EmploymentMode, string> = {
  SALARIED: 'Salaried',
  SELF_EMPLOYED: 'Self-employed',
  UNEMPLOYED: 'Unemployed',
};

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  APPLIED: 'Applied',
  SANCTIONED: 'Sanctioned',
  REJECTED: 'Rejected',
  DISBURSED: 'Disbursed',
  CLOSED: 'Closed',
};

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  REGISTERED: 'Registered',
  NOT_ELIGIBLE: 'Not eligible',
  ELIGIBLE: 'Slip pending',
  READY_TO_APPLY: 'Ready to apply',
};
