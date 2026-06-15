import type { HttpClient } from '@/app/http';
import type { SubmissionRow } from '../types';

/** Llamadas HTTP de envíos a NestJS. Solo I/O. */
export class SubmissionsApi {
  constructor(private readonly http: HttpClient) {}

  /** Lista de envíos; `search` busca por código de envío, nombre o contacto. */
  list(search?: string): Promise<SubmissionRow[]> {
    const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return this.http.get<SubmissionRow[]>(`/admin/submissions${qs}`);
  }

  getById(id: number): Promise<SubmissionRow> {
    return this.http.get<SubmissionRow>(`/admin/submissions/${id}`);
  }
}
