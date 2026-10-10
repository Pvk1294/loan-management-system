import type { Role } from '../constants/roles';

/** The authenticated caller, attached to the request by the `authenticate` middleware. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
