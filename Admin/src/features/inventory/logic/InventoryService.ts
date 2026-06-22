import type { SearchEngineApi } from '../api/SearchEngineApi';
import type { InventoryApi } from '../api/InventoryApi';
import type { ImportResult, ScanResult, ScannedItem, SearchEngineHealth } from '../types';

/** Orquesta el slice de inventario: detección del SearchEngine, escaneo e importación. */
export class InventoryService {
  constructor(
    private readonly searchEngineApi: SearchEngineApi,
    private readonly inventoryApi: InventoryApi,
  ) {}

  health(): Promise<SearchEngineHealth> {
    return this.searchEngineApi.health();
  }

  scan(): Promise<ScanResult> {
    return this.searchEngineApi.scan();
  }

  rescan(): Promise<ScanResult> {
    return this.searchEngineApi.rescan();
  }

  import(items: ScannedItem[]): Promise<ImportResult> {
    return this.inventoryApi.import(items);
  }
}
