import { AdminUser } from '@dahem/domain';

/** Registro persistido del operador del panel, con su hash (el dominio AdminUser no lo lleva). */
export interface AdminUserRecord {
  user: AdminUser;
  passwordHash: string;
}

/** Puerto del repositorio de cuentas del panel admin (modelo de datos ADMIN_USER). */
export abstract class AdminUserRepository {
  abstract count(): Promise<number>;
  abstract findByUsername(username: string): Promise<AdminUserRecord | null>;
  abstract list(): Promise<AdminUser[]>;
  abstract create(username: string, passwordHash: string, displayName: string): Promise<AdminUser>;
}
