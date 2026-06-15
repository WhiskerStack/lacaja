import { AdminUser } from '@daher/domain';
import type { UsersApi } from '../api/UsersApi';
import type { CreateAdminInput } from '../types';

/** Orquesta el slice de usuarios admin; valida vía la entidad AdminUser. */
export class UsersService {
  constructor(private readonly usersApi: UsersApi) {}

  list(): Promise<AdminUser[]> {
    return this.usersApi.list().then((dtos) => dtos.map(AdminUser.fromJSON));
  }

  async create(input: CreateAdminInput): Promise<AdminUser> {
    const errors = new AdminUser(input.username, input.displayName).validate();
    if (input.password.length < 8) errors.push('La contraseña debe tener al menos 8 caracteres.');
    if (errors.length) throw new Error(errors.join(' '));
    const dto = await this.usersApi.create(input);
    return AdminUser.fromJSON(dto);
  }
}
