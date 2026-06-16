import type { HttpClient } from '@/app/http';
import type { AdminUserDTO } from '@dahem/domain';
import type { CreateAdminInput } from '../types';

/** Llamadas HTTP de cuentas admin (operadores del panel) a NestJS. Solo I/O. */
export class AdminsApi {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<AdminUserDTO[]> {
    return this.http.get<AdminUserDTO[]>('/admin/admins');
  }

  create(input: CreateAdminInput): Promise<AdminUserDTO> {
    return this.http.post<AdminUserDTO>('/admin/admins', input);
  }
}
