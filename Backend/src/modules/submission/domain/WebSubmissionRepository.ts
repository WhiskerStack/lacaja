import { WebSubmission } from '@dahem/domain';
import { Criteria } from '../../../shared/criteria/Criteria';

/** Puerto del repositorio de envíos por web (modelo de datos WEB_SUBMISSION). */
export abstract class WebSubmissionRepository {
  abstract match(criteria: Criteria): Promise<WebSubmission[]>;
  abstract findById(id: number): Promise<WebSubmission | null>;
  abstract save(entity: WebSubmission): Promise<WebSubmission>;
}
