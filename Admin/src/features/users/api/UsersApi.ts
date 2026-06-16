import type { HttpClient } from '@/app/http';
import type { UserDTO } from '@dahem/domain';
import type { UpdateUserInput } from '../types';

/** Llamadas HTTP de gestión de clientes del sistema (USER) a NestJS. Solo I/O. */
export class UsersApi {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<UserDTO[]> {
    return this.http.get<UserDTO[]>('/admin/users');
  }

  update(id: number, input: UpdateUserInput): Promise<UserDTO> {
    return this.http.put<UserDTO>(`/admin/users/${id}`, input);
  }

  setBanned(id: number, banned: boolean): Promise<UserDTO> {
    return this.http.patch<UserDTO>(`/admin/users/${id}/ban`, { banned });
  }

  remove(id: number): Promise<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`/admin/users/${id}`);
  }
}
