import { ListItemDTO } from "../my-list/types";


export type SubmissionChannel = 'web' | 'whatsapp' | 'txt' | 'clipboard';

/** Datos necesarios para generar el mensaje de un envío (snapshot de la lista). */
export interface SubmissionData {
  items: ListItemDTO[];
  totalGb: number;
  totalPrice: number;
}
