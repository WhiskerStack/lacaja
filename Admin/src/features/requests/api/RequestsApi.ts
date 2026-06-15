import type { HttpClient } from '@/app/http';
import type { RequestRow } from '../types';
import type { RequestStatus } from '@dahem/domain';

/** Llamadas HTTP de solicitudes a NestJS. Solo I/O. */
export class RequestsApi {
  constructor(private readonly http: HttpClient) {}

  list(status?: RequestStatus): Promise<RequestRow[]> {
    const qs = status ? `?status=${status}` : '';
    return this.http.get<RequestRow[]>(`/admin/requests${qs}`);
  }

  updateStatus(id: number, status: RequestStatus): Promise<RequestRow> {
    return this.http.patch<RequestRow>(`/admin/requests/${id}/status`, { status });
  }
}
