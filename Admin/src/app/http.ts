// Cliente HTTP base del panel: añade baseURL y el token Bearer, y centraliza
// el manejo de errores (401 → sesión inválida). Es la frontera con NestJS.

export interface HttpClientDeps {
  /** Lee el token actual (o null si no hay sesión). Inyectado por awilix. */
  getToken: () => string | null;
  /** Se invoca al recibir un 401 para limpiar sesión y redirigir a login. */
  onUnauthorized?: () => void;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class HttpClient {
  // CLASSIC awilix: el nombre del parámetro debe coincidir con la clave registrada.
  constructor(private readonly httpDeps: HttpClientDeps) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.httpDeps.getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      this.httpDeps.onUnauthorized?.();
      throw new HttpError(401, 'No autorizado. Inicia sesión de nuevo.');
    }

    const text = await res.text();
    const data = text ? safeParse(text) : undefined;

    if (!res.ok) {
      const message = extractMessage(data) ?? `Error ${res.status}`;
      throw new HttpError(res.status, message, data);
    }

    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body ?? {});
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body ?? {});
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body ?? {});
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(data: unknown): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string') return m;
  }
  return null;
}
