import { List } from '@daher/domain';

/** Puerto del repositorio de "Mi lista" persistida del usuario (modelo de datos LIST). */
export abstract class ListRepository {
  /** Lista del usuario (vacía si no tiene ninguna). */
  abstract findByUser(userId: number): Promise<List>;
  /** Reemplaza por completo los ítems de la lista del usuario (merge lo hace el cliente). */
  abstract replace(userId: number, list: List, availableSpaceGb?: number): Promise<List>;
}
