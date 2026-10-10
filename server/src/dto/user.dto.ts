import type { Role } from '../constants/roles';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function toUserDTO(user: { id: string; name: string; email: string; role: Role }): UserDTO {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
