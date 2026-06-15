import { Audiovisual } from '@dahem/domain';
import { Criteria } from '../../../shared/criteria/Criteria';

/**
 * Puerto del repositorio de audiovisuales (arquitectura §5.2). Clase ABSTRACTA, no
 * interface: NestJS la usa como token de inyección en runtime. Operaciones genéricas
 * basadas en Criteria; un `match` reemplaza la familia de findByX.
 */
export abstract class AudiovisualRepository {
  abstract match(criteria: Criteria): Promise<Audiovisual[]>;
  abstract count(criteria: Criteria): Promise<number>;
  abstract findById(id: number): Promise<Audiovisual | null>;
  abstract save(entity: Audiovisual): Promise<Audiovisual>;
  abstract delete(id: number): Promise<void>;
}
