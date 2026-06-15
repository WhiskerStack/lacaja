import type { HttpClient } from '@/app/http';

/** Estado del build de publicación reportado por NestJS. */
export interface PublishStatus {
  /** Estado del último/actual build. El backend puede variar las etiquetas. */
  state?: 'idle' | 'running' | 'success' | 'error' | string;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  /** Si hay cambios sin publicar pendientes. */
  hasPendingChanges?: boolean;
}

export interface PublishResult {
  started?: boolean;
  message?: string;
}

/** Llamadas HTTP de publicación a NestJS. Solo I/O. */
export class PublishApi {
  constructor(private readonly http: HttpClient) {}

  trigger(): Promise<PublishResult> {
    return this.http.post<PublishResult>('/admin/publish');
  }

  status(): Promise<PublishStatus> {
    return this.http.get<PublishStatus>('/admin/publish/status');
  }
}
