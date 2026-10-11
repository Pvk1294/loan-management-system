/** Letters in any script, with spaces, dots, apostrophes and hyphens inside. No digits. Mirrors the API's rule. */
const NAME_REGEX = /^\p{L}[\p{L}\p{M} .'-]*$/u;

/** Returns what is wrong with a person's name, or null if it is fine. */
export function nameProblem(value: string): string | null {
  const name = value.trim();
  if (name.length < 2) return 'Enter your full name.';
  if (!NAME_REGEX.test(name)) return 'Enter your name using letters only, not a phone number or email.';
  return null;
}
