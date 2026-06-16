import { AdminUser } from '@dahem/domain';
import type { AdminsApi } from '../api/AdminsApi';
import type { CreateAdminInput } from '../types';

/** Orquesta el slice de cuentas admin (operadores del panel); valida vía la entidad AdminUser. */
export class AdminsService {
  constructor(private readonly adminsApi: AdminsApi) {}

  list(): Promise<AdminUser[]> {
    return this.adminsApi.list().then((dtos) => dtos.map(AdminUser.fromJSON));
  }

  async create(input: CreateAdminInput): Promise<AdminUser> {
    const errors = new AdminUser(input.username, input.displayName).validate();
    if (input.password.length < 8) errors.push('La contraseña debe tener al menos 8 caracteres.');
    if (errors.length) throw new Error(errors.join(' '));
    const dto = await this.adminsApi.create(input);
    return AdminUser.fromJSON(dto);
  }
}
