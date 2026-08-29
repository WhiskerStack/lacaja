// Tipos del slice my-list. El DTO del ítem lo provee @dahem/domain (ListItemDTO).

import { ListItemDTO } from "../common/domain/types";


export type { ListItemDTO };

/** Snapshot que la UI de catalog pasa a listService.add (arquitectura §4: sin import cruzado). */
export interface AddToListInput {
  code: string;
  level: ListItemDTO['level'];
  targetId: string;
  name: string;
  sizeGb: number;
  price: number;
}

/** Estado serializable del drawer que viaja por el store (DTOs planos, no instancias). */
export interface ListSnapshot {
  items: ListItemDTO[];
  totalGb: number;
  totalPrice: number;
  count: number;
  availableSpaceGb: number | null;
}
