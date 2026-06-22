import { useMutation, useQuery } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { InventoryService } from './logic/InventoryService';
import type { ScannedItem } from './types';

/**
 * Detección del SearchEngine local. Reintenta en segundo plano cada 20s para que la
 * sección aparezca/desaparezca según el puerto esté habilitado o no.
 */
export function useSearchEngineHealth() {
  const service = useService<InventoryService>('inventoryService');
  return useQuery({
    queryKey: ['search-engine-health'],
    queryFn: () => service.health(),
    retry: false,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}

export function useScanInventory() {
  const service = useService<InventoryService>('inventoryService');
  return useMutation({ mutationFn: () => service.scan() });
}

export function useRescanInventory() {
  const service = useService<InventoryService>('inventoryService');
  return useMutation({ mutationFn: () => service.rescan() });
}

export function useImportCatalog() {
  const service = useService<InventoryService>('inventoryService');
  return useMutation({
    mutationFn: (items: ScannedItem[]) => service.import(items),
  });
}
