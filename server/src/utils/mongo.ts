import { Types } from 'mongoose';

/** True for MongoDB's duplicate-key error (E11000), raised when a unique index is violated. */
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/** Escapes user input so it can be used inside a regular expression as plain text. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);
