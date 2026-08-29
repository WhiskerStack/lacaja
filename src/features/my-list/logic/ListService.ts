// ListService: orquesta Dexie ↔ dominio (arquitectura §3, §6.1). No contiene reglas:
// reconstruye una List de @dahem/domain y le pide los totales. Recibe sus dependencias
// por constructor (la tabla de items y la de meta) para ser testeable con fakes.
import type { Table } from 'dexie';
import type { AddToListInput, ListSnapshot } from '../types';
import { ListItemDTO } from '@/features/common/domain/types';
import { ListItem } from '@/domains/ListItem';
import { List } from '@/features/my-list/domain/List';

interface MetaRow {
  key: string;
  value: string;
}

export class ListService {
  constructor(
    private readonly items: Table<ListItemDTO, string>,
    private readonly meta: Table<MetaRow, string>,
    private readonly availableSpaceKey = 'availableSpaceGb',
  ) {}

  /** Agrega un ítem (persiste el DTO plano). Idempotente por `code` (PK). */
  async add(input: AddToListInput): Promise<ListSnapshot> {
    const item = new ListItem(
      input.code,
      input.level,
      input.targetId,
      input.name,
      input.sizeGb,
      input.price,
    );
    await this.items.put(item.toJSON());
    return this.snapshot();
  }

  async remove(code: string): Promise<ListSnapshot> {
    await this.items.delete(code);
    return this.snapshot();
  }

  /** Reinserta un ítem quitado (para el "Deshacer" del toast, funcional §7.2). */
  async restore(dto: ListItemDTO): Promise<ListSnapshot> {
    await this.items.put(dto);
    return this.snapshot();
  }

  async has(code: string): Promise<boolean> {
    return (await this.items.get(code)) !== undefined;
  }

  async setAvailableSpace(gb: number | null): Promise<ListSnapshot> {
    if (gb === null || Number.isNaN(gb)) {
      await this.meta.delete(this.availableSpaceKey);
    } else {
      await this.meta.put({ key: this.availableSpaceKey, value: String(gb) });
    }
    return this.snapshot();
  }

  private async readAvailableSpace(): Promise<number | null> {
    const row = await this.meta.get(this.availableSpaceKey);
    if (!row) return null;
    const n = Number(row.value);
    return Number.isFinite(n) ? n : null;
  }

  /** Reconstruye la List desde Dexie y deriva el snapshot (hidratación en la frontera). */
  async snapshot(): Promise<ListSnapshot> {
    const dtos = await this.items.toArray();
    const list = new List(dtos.map(ListItem.fromJSON)); // la regla vive en List
    const availableSpaceGb = await this.readAvailableSpace();
    return {
      items: dtos,
      totalGb: Math.round(list.totalGb() * 100) / 100,
      totalPrice: list.totalPrice(),
      count: list.count(),
      availableSpaceGb,
    };
  }
}
