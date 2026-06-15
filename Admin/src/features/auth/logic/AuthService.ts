import { AdminUser } from '@daher/domain';
import type { AuthApi } from '../api/AuthApi';
import type { BootstrapData, LoginCredentials, Session } from '../types';

const STORAGE_KEY = 'daher.admin.session';

/**
 * Servicio de sesión: guarda el token (localStorage), lo expone para el cliente
 * HTTP y resuelve login/bootstrap. Hidrata el DTO de admin a entidad de dominio.
 */
export class AuthService {
  private session: Session | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly authApi: AuthApi) {
    this.session = readStored();
  }

  // --- Estado de sesión ---

  getToken(): string | null {
    return this.session?.token ?? null;
  }

  getAdmin(): AdminUser | null {
    return this.session ? AdminUser.fromJSON(this.session.admin) : null;
  }

  isAuthenticated(): boolean {
    return this.session !== null;
  }

  /** Suscripción al cambio de sesión (lo consume el provider de React). */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Operaciones ---

  async login(credentials: LoginCredentials): Promise<void> {
    const res = await this.authApi.login(credentials);
    this.setSession({ token: res.accessToken, admin: res.admin });
  }

  async bootstrap(data: BootstrapData): Promise<void> {
    const res = await this.authApi.bootstrap(data);
    this.setSession({ token: res.accessToken, admin: res.admin });
  }

  logout(): void {
    this.setSession(null);
  }

  // --- Internos ---

  private setSession(session: Session | null): void {
    this.session = session;
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.listeners.forEach((l) => l());
  }
}

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed?.token && parsed?.admin) return parsed;
    return null;
  } catch {
    return null;
  }
}
