import { z } from 'zod';

/** A MongoDB ObjectId as it appears in a URL: 24 hexadecimal characters. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
