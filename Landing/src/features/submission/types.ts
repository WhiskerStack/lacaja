import type { ListItemDTO } from '@daher/domain';

export type SubmissionChannel = 'web' | 'whatsapp' | 'txt' | 'clipboard';

/** Datos necesarios para generar el mensaje de un envío (snapshot de la lista). */
export interface SubmissionData {
  items: ListItemDTO[];
  totalGb: number;
  totalPrice: number;
  /** Nombre del usuario si hay sesión (opcional para vías sin cuenta). */
  customerName?: string;
}
