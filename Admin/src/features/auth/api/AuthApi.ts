import type { HttpClient } from '@/app/http';
import type { AuthResponse, BootstrapData, LoginCredentials } from '../types';

/** Llamadas HTTP de autenticación contra NestJS. Solo I/O. */
export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/admin/login', credentials);
  }

  bootstrap(data: BootstrapData): Promise<AuthResponse> {
    return this.http.post<AuthResponse>('/admin/bootstrap', data);
  }

  /** ¿Sigue disponible el bootstrap? (true mientras no exista ningún admin). */
  bootstrapStatus(): Promise<{ needsBootstrap: boolean }> {
    return this.http.get<{ needsBootstrap: boolean }>('/admin/bootstrap-status');
  }
}
