import type { ItemLevel, ListItemDTO } from '../features/common/domain/types';

/**
 * Ítem de "Mi lista". Conecta con la referencia por nivel del modelo de datos (§3.2):
 * guarda el `level` (qué se agregó) y datos-snapshot (name, sizeGb, price) copiados al
 * agregar, para no depender del catálogo vivo.
 */
export class ListItem {
  constructor(
    public readonly code: string,
    public readonly level: ItemLevel,
    public readonly targetId: number,
    public readonly name: string,
    public readonly sizeGb: number,
    public readonly price: number,
  ) {}

  static fromJSON(d: ListItemDTO): ListItem {
    return new ListItem(d.code, d.level, d.targetId, d.name, d.sizeGb, d.price);
  }

  toJSON(): ListItemDTO {
    return {
      code: this.code,
      level: this.level,
      targetId: this.targetId,
      name: this.name,
      sizeGb: this.sizeGb,
      price: this.price,
    };
  }
}
