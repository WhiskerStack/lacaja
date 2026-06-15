import type { UserDTO } from '@daher/domain';

export type AuthMode = 'login' | 'register';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface LoginInput {
  contact: string; // email o teléfono
}

export interface AuthResult {
  user: UserDTO;
  token: string;
}
