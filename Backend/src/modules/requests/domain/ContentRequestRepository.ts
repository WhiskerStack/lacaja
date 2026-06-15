import { ContentRequest } from '@daher/domain';
import { Criteria } from '../../../shared/criteria/Criteria';

/** Puerto del repositorio de solicitudes de contenido (modelo de datos REQUEST). */
export abstract class ContentRequestRepository {
  abstract match(criteria: Criteria): Promise<ContentRequest[]>;
  abstract findById(id: number): Promise<ContentRequest | null>;
  abstract save(entity: ContentRequest): Promise<ContentRequest>;
}
