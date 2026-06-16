import { User } from '@dahem/domain';
import type { UsersApi } from '../api/UsersApi';
import type { UpdateUserInput } from '../types';

/** Orquesta el slice de clientes del sistema; valida la edición vía la entidad User. */
export class UsersService {
  constructor(private readonly usersApi: UsersApi) {}

  list(): Promise<User[]> {
    return this.usersApi.list().then((dtos) => dtos.map(User.fromJSON));
  }

  async update(id: number, input: UpdateUserInput): Promise<User> {
    const errors = new User(input.firstName, input.lastName, input.email, input.phone).validate();
    if (errors.length) throw new Error(errors.join(' '));
    return User.fromJSON(await this.usersApi.update(id, input));
  }

  setBanned(id: number, banned: boolean): Promise<User> {
    return this.usersApi.setBanned(id, banned).then(User.fromJSON);
  }

  async remove(id: number): Promise<void> {
    await this.usersApi.remove(id);
  }
}
