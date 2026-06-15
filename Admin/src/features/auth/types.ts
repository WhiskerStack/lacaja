import type { AdminUserDTO } from '@dahem/domain';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface BootstrapData {
  username: string;
  password: string;
  displayName: string;
}

/** Respuesta de /auth/admin/login y /admin/bootstrap. */
export interface AuthResponse {
  admin: AdminUserDTO;
  accessToken: string;
}

/** Sesión persistida en localStorage. */
export interface Session {
  token: string;
  admin: AdminUserDTO;
}
