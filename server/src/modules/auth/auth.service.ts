import bcrypt from 'bcryptjs';
import { Role } from '../../constants/roles';
import { type UserDTO, toUserDTO } from '../../dto/user.dto';
import { User } from '../../models/user.model';
import { signAccessToken } from '../../services/token';
import { ApiError } from '../../utils/ApiError';
import { isDuplicateKeyError } from '../../utils/mongo';
import type { LoginInput, SignupInput } from './auth.schema';

export const PASSWORD_SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: UserDTO;
}

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

// Compared against when the email is unknown, so a login attempt takes the same
// time whether or not the account exists and cannot be used to discover emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', PASSWORD_SALT_ROUNDS);

/**
 * Public sign-up always creates a borrower. Staff accounts are never created
 * through the API; they come from the seed script.
 */
export async function registerBorrower({ name, email, password }: SignupInput): Promise<AuthResult> {
  const emailTaken = ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists.');
  if (await User.exists({ email })) throw emailTaken;

  try {
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: Role.BORROWER,
    });
    return { token: signAccessToken(user), user: toUserDTO(user) };
  } catch (err) {
    // Two sign-ups with the same email at the same moment: the unique index decides.
    if (isDuplicateKeyError(err)) throw emailTaken;
    throw err;
  }
}

export async function login({ email, password }: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    // Deliberately the same message for "no such account" and "wrong password".
    throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }
  return { token: signAccessToken(user), user: toUserDTO(user) };
}
