import { type HydratedDocument, Schema, model } from 'mongoose';
import { ROLES, Role } from '../constants/roles';

export interface IUser {
  name: string;
  email: string;
  /** bcrypt hash. Excluded from queries unless explicitly selected. */
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: Role.BORROWER, index: true },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<IUser>;

export const User = model<IUser>('User', userSchema);
