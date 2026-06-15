import { Audiovisual, type AudiovisualDTO } from '@daher/domain';
import { describe, expect, it } from 'vitest';
import { Criteria } from '../../shared/criteria/Criteria';
import { CollectionFilter } from '../../shared/criteria/CollectionFilter';
import { CatalogService } from './application/CatalogService';
import { AudiovisualRepository } from './domain/AudiovisualRepository';
import { CatalogMetadataRepository } from './domain/CatalogMetadataRepository';

/** Repo fake backed by CollectionFilter: ejercita el patrón Criteria de verdad sin BD (arquitectura §8). */
class FakeAudiovisualRepository extends AudiovisualRepository {
  private filter: CollectionFilter<AudiovisualDTO & Record<string, unknown>>;
  constructor(private seed: AudiovisualDTO[]) {
    super();
    this.filter = new CollectionFilter(seed as (AudiovisualDTO & Record<string, unknown>)[]);
  }
  async match(c: Criteria) {
    return this.filter.findAll(c).map((r) => Audiovisual.fromRow(r));
  }
  async count(c: Criteria) {
    return this.filter.count(c);
  }
  async findById(id: number) {
    const found = this.seed.find((s) => s.id === id);
    return found ? Audiovisual.fromRow(found) : null;
  }
  async save(entity: Audiovisual) {
    this.seed.push(entity.toRow());
    return entity;
  }
  async delete(id: number) {
    this.seed = this.seed.filter((s) => s.id !== id);
  }
}

// Metadata no se usa en estos tests; stub vacío.
const metaStub = {} as CatalogMetadataRepository;

const seed: AudiovisualDTO[] = [
  { id: 1, type: 'movie', name: 'The Matrix', year: 1999, rating: 8.7, sizeGb: 2, isPremiere: false },
  { id: 2, type: 'movie', name: 'Estreno', year: 2025, rating: 7, sizeGb: 3, isPremiere: true },
  { id: 3, type: 'series', name: 'Juego de Tronos', year: 2011, rating: 9, sizeGb: 0, isPremiere: false },
];

describe('CatalogService', () => {
  it('busca por tipo con paginación y orden por año descendente', async () => {
    const service = new CatalogService(new FakeAudiovisualRepository([...seed]), metaStub);
    const { items, total } = await service.search({ type: 'movie' });
    expect(total).toBe(2);
    expect(items[0].name).toBe('Estreno'); // 2025 antes que 1999
  });

  it('busca por nombre parcial (LIKE)', async () => {
    const service = new CatalogService(new FakeAudiovisualRepository([...seed]), metaStub);
    const { items } = await service.search({ name: 'tronos' });
    expect(items.map((a) => a.code())).toEqual(['S0003']);
  });

  it('homeData devuelve sólo estrenos', async () => {
    const service = new CatalogService(new FakeAudiovisualRepository([...seed]), metaStub);
    const { premieres, total } = await service.homeData();
    expect(total).toBe(3);
    expect(premieres.every((p) => p.isPremiere)).toBe(true);
    expect(premieres).toHaveLength(1);
  });

  it('create valida la regla de dominio (película sin peso)', async () => {
    const service = new CatalogService(new FakeAudiovisualRepository([...seed]), metaStub);
    await expect(
      service.create({ type: 'movie', name: 'Sin peso', year: 2020, rating: 5, sizeGb: 0 }),
    ).rejects.toThrow(/peso en GB/i);
  });
});
