import { User } from '@dahem/domain';

/** Registro persistido del cliente, con su hash de credencial (opcional) y si está vetado. */
export interface UserRecord {
  user: User;
  passwordHash: string | null;
  banned: boolean;
}

/** Campos editables de un cliente desde el panel admin (code e id son inmutables). */
export interface UpdateUserData {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

/** Puerto del repositorio de clientes del landing (modelo de datos USER). */
export abstract class UserRepository {
  abstract findById(id: number): Promise<User | null>;
  abstract findByContact(email?: string, phone?: string): Promise<UserRecord | null>;
  abstract create(user: User, passwordHash: string | null): Promise<User>;
  /** Lista todos los clientes (panel admin). */
  abstract list(): Promise<User[]>;
  /** Edita los datos de contacto; no toca code ni banned. Devuelve null si no existe. */
  abstract update(id: number, data: UpdateUserData): Promise<User | null>;
  /** Borra el cliente. Devuelve false si no existía. */
  abstract delete(id: number): Promise<boolean>;
  /** Veta o reactiva el cliente. Devuelve el cliente actualizado, o null si no existe. */
  abstract setBanned(id: number, banned: boolean): Promise<User | null>;
}
