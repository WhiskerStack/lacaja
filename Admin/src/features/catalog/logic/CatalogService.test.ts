import { describe, expect, it, vi } from 'vitest';
import { CatalogService, extractYoutubeId } from './CatalogService';
import type { CatalogApi } from '../api/CatalogApi';
import type { AudiovisualInput } from '../types';

// Fake de la api inyectado por constructor (igual que haría awilix con asValue).
function makeFakeApi() {
  return {
    create: vi.fn(async (input: AudiovisualInput) => ({
      ...input,
      id: 1,
      code: 'P0001',
      isEpisodic: input.type !== 'movie',
    })),
    createEpisode: vi.fn(),
  } as unknown as CatalogApi;
}

const validMovie: AudiovisualInput = {
  type: 'movie',
  name: 'Matrix',
  year: 1999,
  rating: 8.7,
  sizeGb: 4.5,
  isPremiere: false,
};

describe('CatalogService.create', () => {
  it('crea un audiovisual válido pasando por la api', async () => {
    const api = makeFakeApi();
    const service = new CatalogService(api);
    const result = await service.create(validMovie);
    expect(api.create).toHaveBeenCalledOnce();
    expect(result.code).toBe('P0001');
  });

  it('rechaza una película sin peso (regla del dominio)', async () => {
    const api = makeFakeApi();
    const service = new CatalogService(api);
    await expect(service.create({ ...validMovie, sizeGb: 0 })).rejects.toThrow(/peso/i);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('rechaza un nombre vacío', async () => {
    const api = makeFakeApi();
    const service = new CatalogService(api);
    await expect(service.create({ ...validMovie, name: '  ' })).rejects.toThrow(/nombre/i);
  });

  it('normaliza el peso a 0 para episódicos', async () => {
    const api = makeFakeApi();
    const service = new CatalogService(api);
    await service.create({ ...validMovie, type: 'series', sizeGb: 99 });
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ sizeGb: 0 }));
  });
});

describe('extractYoutubeId', () => {
  it('acepta un id directo', () => {
    expect(extractYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('extrae el id de una url youtu.be', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('extrae el id de una url watch?v=', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('devuelve null para basura', () => {
    expect(extractYoutubeId('no-es-un-enlace')).toBeNull();
  });
});
