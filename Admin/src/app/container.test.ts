import { describe, expect, it, vi } from 'vitest';
import { createContainer, asClass, asValue, InjectionMode } from 'awilix';
import { CatalogService } from '@/features/catalog/logic/CatalogService';
import type { CatalogApi } from '@/features/catalog/api/CatalogApi';

/**
 * Verifica que awilix en modo CLASSIC resuelve un servicio por el nombre del
 * parámetro del constructor (`catalogApi`) y que se puede inyectar un fake con
 * asValue para los tests, sin tocar la red.
 */
describe('contenedor awilix (CLASSIC)', () => {
  it('resuelve CatalogService con un CatalogApi fake', async () => {
    const fakeApi = {
      list: vi.fn(async () => ({
        total: 1,
        items: [
          { id: 1, type: 'movie', name: 'X', year: 2000, rating: 5, sizeGb: 3, isPremiere: false, code: 'P0001', isEpisodic: false },
        ],
      })),
    } as unknown as CatalogApi;

    const container = createContainer({ injectionMode: InjectionMode.CLASSIC });
    container.register({
      catalogApi: asValue(fakeApi),
      catalogService: asClass(CatalogService).singleton(),
    });

    const service = container.resolve<CatalogService>('catalogService');
    const rows = await service.list();
    expect(rows).toHaveLength(1);
    expect(fakeApi.list).toHaveBeenCalledOnce();
  });
});
