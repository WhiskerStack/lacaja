import type { ContentRequestDTO, RequestStatus } from '@daher/domain';

/** Fila de solicitud con datos de contacto del solicitante (para el aviso). */
export interface RequestRow extends ContentRequestDTO {
  createdAt?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export type { RequestStatus };
