import { z } from 'zod';

/** A MongoDB ObjectId as it appears in a URL: 24 hexadecimal characters. */
/**
 * A person's name: letters (any script), with spaces, dots, apostrophes and
 * hyphens allowed inside. Digits are refused, so a phone number or an email
 * typed into a name box is caught.
 */
export const personNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter your full name.')
  .max(100)
  .regex(/^\p{L}[\p{L}\p{M} .'-]*$/u, 'A name can only contain letters, spaces, dots, apostrophes and hyphens.');

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
