import { WebSubmission } from '@dahem/domain';
import type { SubmissionsApi } from '../api/SubmissionsApi';
import type { SubmissionRow } from '../types';

/** Orquesta el slice de envíos. Hidrata DTOs a la entidad de dominio. */
export class SubmissionsService {
  constructor(private readonly submissionsApi: SubmissionsApi) {}

  list(search?: string): Promise<SubmissionRow[]> {
    return this.submissionsApi.list(search);
  }

  getById(id: number): Promise<SubmissionRow> {
    return this.submissionsApi.getById(id);
  }

  /** Hidrata a entidad de dominio para reutilizar totales y reglas. */
  toEntity(row: SubmissionRow): WebSubmission {
    return WebSubmission.fromJSON(row);
  }
}
