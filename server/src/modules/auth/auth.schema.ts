import { z } from 'zod';
import { personNameSchema } from '../../utils/validation';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.'));

export const signupSchema = z.object({
  name: personNameSchema,
  email,
  // bcrypt only reads the first 72 bytes of a password, so longer ones are refused.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be at most 72 characters.')
    .regex(/[A-Za-z]/, 'Password must contain a letter.')
    .regex(/[0-9]/, 'Password must contain a number.'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
