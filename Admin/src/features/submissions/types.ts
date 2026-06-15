import type { WebSubmissionDTO } from '@daher/domain';

/**
 * Fila de envío como la devuelve NestJS. Extiende el DTO de dominio con datos
 * de contacto del usuario (snapshot para localizarlo en el encuentro).
 */
export interface SubmissionRow extends WebSubmissionDTO {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}
