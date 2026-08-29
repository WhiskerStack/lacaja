import { UserDTO } from "../common/domain/types";


export type AuthMode = 'login' | 'register';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  password: string;
  email?: string;
  phone?: string;
}

export interface LoginInput {
  contact: string; // email o teléfono
  password: string;
}

export interface AuthResult {
  user: UserDTO;
  token: string;
}
