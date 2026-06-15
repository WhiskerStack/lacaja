import { describe, expect, it, vi } from 'vitest';
import {
  SearchProvider,
  type SearchResult,
} from '../catalog/domain/SearchProvider';
import { SearchService } from './application/SearchService';

class FakeSearchProvider extends SearchProvider {
  async search(): Promise<SearchResult[]> {
    return [];
  }
  async suggest(): Promise<SearchResult[]> {
    return [];
  }
}

describe('SearchService routing (búsqueda §2.4)', () => {
  const service = new SearchService(new FakeSearchProvider());

  it('detecta códigos de película y episódico', () => {
    expect(service.route('P0023')).toBe('code');
    expect(service.route('S1122')).toBe('code');
    expect(service.route('S1122-3')).toBe('code');
    expect(service.route('s1122-3-10')).toBe('code'); // case-insensitive
  });

  it('rutea texto libre a búsqueda léxica', () => {
    expect(service.route('juego de tronos')).toBe('lexical');
    expect(service.route('matrix')).toBe('lexical');
  });

  it('marca query vacía como empty y no llama al provider', async () => {
    const provider = new FakeSearchProvider();
    const spy = vi.spyOn(provider, 'search');
    const s = new SearchService(provider);
    expect(s.route('   ')).toBe('empty');
    expect(await s.search('   ')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('delega en el provider para queries no vacías', async () => {
    const provider = new FakeSearchProvider();
    const spy = vi.spyOn(provider, 'search').mockResolvedValue([
      { id: 1, code: 'P0001', name: 'X', type: 'movie', year: 2000 },
    ]);
    const s = new SearchService(provider);
    const results = await s.search('algo');
    expect(spy).toHaveBeenCalledWith('algo', { limit: undefined });
    expect(results).toHaveLength(1);
  });
});
