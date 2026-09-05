import { ListItem } from '../../../domains/ListItem';
import type { ListItemDTO } from '../../common/domain/types';

/**
 * "Mi lista" del usuario. Agregado con invariantes propios: total e invariante de espacio.
 * Las reglas (§7.2–7.3 funcional) viven aquí, no en la UI.
 */
export class List {
  constructor(public readonly items: ListItem[] = []) {}

  totalGb(): number {
    return this.items.reduce((sum, i) => sum + i.sizeGb, 0);
  }

  totalPrice(): number {
    return this.items.reduce((sum, i) => sum + i.price, 0);
  }

  count(): number {
    return this.items.length;
  }

  has(code: string): boolean {
    return this.items.some((i) => i.code === code);
  }

  /** §7.3 funcional: ¿cabe en el espacio que el usuario declaró? */
  fitsIn(spaceGb: number): boolean {
    return this.totalGb() <= spaceGb;
  }

  /** Cuánto se pasa del espacio declarado (0 si cabe). */
  overflowGb(spaceGb: number): number {
    return Math.max(0, this.totalGb() - spaceGb);
  }

  static fromJSON(items: ListItemDTO[]): List {
    return new List(items.map(ListItem.fromJSON));
  }

  toJSON() {
    return this.items.map((i) => i.toJSON());
  }
}
