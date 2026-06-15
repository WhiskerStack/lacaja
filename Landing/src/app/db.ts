// Definición de Dexie: en el cliente solo "Mi lista" tiene escritura real (modelo de datos §5).
// Tabla listItems con `code` como PK (DEXIE_LIST_ITEM) y tabla meta para el espacio disponible.
import Dexie, { type Table } from 'dexie';
import type { ListItemDTO } from '@daher/domain';

export interface MetaRow {
  key: string;
  value: string;
}

export class DaherDB extends Dexie {
  listItems!: Table<ListItemDTO, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('daher');
    this.version(1).stores({
      listItems: 'code', // PK = code (DEXIE_LIST_ITEM)
      meta: 'key', // availableSpaceGb, etc.
    });
  }
}

// Una única instancia para el cliente. En SSR/build no se instancia IndexedDB hasta usarse.
export const db = new DaherDB();

export const META_AVAILABLE_SPACE = 'availableSpaceGb';
