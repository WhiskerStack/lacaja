import type { HttpClient } from '@/app/http';
import type { AdminUserDTO } from '@daher/domain';
import type { CreateAdminInput } from '../types';

/** Llamadas HTTP de cuentas admin a NestJS. Solo I/O. */
export class UsersApi {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<AdminUserDTO[]> {
    return this.http.get<AdminUserDTO[]>('/admin/users');
  }

  create(input: CreateAdminInput): Promise<AdminUserDTO> {
    return this.http.post<AdminUserDTO>('/admin/users', input);
  }
}
