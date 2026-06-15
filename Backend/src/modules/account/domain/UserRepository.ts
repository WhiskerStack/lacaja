import { User } from '@dahem/domain';

/** Registro persistido del cliente, con su hash de credencial (opcional). */
export interface UserRecord {
  user: User;
  passwordHash: string | null;
}

/** Puerto del repositorio de clientes del landing (modelo de datos USER). */
export abstract class UserRepository {
  abstract findById(id: number): Promise<User | null>;
  abstract findByContact(email?: string, phone?: string): Promise<UserRecord | null>;
  abstract create(user: User, passwordHash: string | null): Promise<User>;
}
