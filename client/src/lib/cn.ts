type ClassValue = string | false | null | undefined;

/** Joins class names, skipping anything falsy. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
