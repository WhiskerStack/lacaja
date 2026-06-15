import { ContentRequest, type RequestStatus } from '@daher/domain';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Criteria, type CriteriaFilter } from '../../../shared/criteria/Criteria';
import { ContentRequestRepository } from '../domain/ContentRequestRepository';

@Injectable()
export class RequestsService {
  constructor(private readonly repo: ContentRequestRepository) {}

  /** El cliente registra una solicitud de contenido no disponible. */
  create(userId: number, searchText: string): Promise<ContentRequest> {
    return this.repo.save(new ContentRequest(userId, searchText, 'pending'));
  }

  /** Listado para el admin, con filtro opcional por estado. El servicio arma el Criteria. */
  list(status?: RequestStatus): Promise<ContentRequest[]> {
    const filters: CriteriaFilter[] = status
      ? [{ field: 'status', operator: '=', value: status }]
      : [];
    return this.repo.match(new Criteria({ filters, orders: [{ field: 'id', direction: 'DESC' }] }));
  }

  /** El admin cambia el estado (pending → available → notified). */
  async updateStatus(id: number, status: RequestStatus): Promise<ContentRequest> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(`Solicitud ${id} no encontrada.`);
    return this.repo.save(found.withStatus(status));
  }
}
