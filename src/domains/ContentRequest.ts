import type { ContentRequestDTO, RequestStatus } from '../features/common/domain/types';

/** Solicitud de contenido no disponible (funcional §6.4.3 landing, §6 admin). */
export class ContentRequest {
  constructor(
    public readonly userId: number,
    public readonly searchText: string,
    public readonly status: RequestStatus = 'pending',
    public readonly id?: number,
  ) {}

  withStatus(status: RequestStatus): ContentRequest {
    return new ContentRequest(this.userId, this.searchText, status, this.id);
  }

  static fromJSON(d: ContentRequestDTO): ContentRequest {
    return new ContentRequest(d.userId, d.searchText, d.status, d.id);
  }

  toJSON(): ContentRequestDTO {
    return { id: this.id, userId: this.userId, searchText: this.searchText, status: this.status };
  }
}
