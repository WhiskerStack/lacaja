import { ContentRequest, type RequestStatus } from '@dahem/domain';
import type { RequestsApi } from '../api/RequestsApi';
import type { RequestRow } from '../types';

/** Orquesta el slice de solicitudes; aplica la transición de estado del dominio. */
export class RequestsService {
  constructor(private readonly requestsApi: RequestsApi) {}

  list(status?: RequestStatus): Promise<RequestRow[]> {
    return this.requestsApi.list(status);
  }

  async updateStatus(row: RequestRow, status: RequestStatus): Promise<RequestRow> {
    // Pasa por el dominio para validar la transición (withStatus).
    const entity = ContentRequest.fromJSON(row).withStatus(status);
    if (entity.id === undefined) throw new Error('La solicitud no tiene id.');
    return this.requestsApi.updateStatus(entity.id, entity.status);
  }
}
