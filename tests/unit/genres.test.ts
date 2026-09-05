// Tests de los géneros múltiples: parseo desde el Excel (sync-catalog), mapeo desde TMDB
// (enrich-catalog) y proyección al índice de Biblioteca (build-search-index).
import { describe, it, expect } from 'vitest';
import {
  parseItem,
  normalizeGenres,
  itemGenres,
} from '../../scripts/sync-catalog.mjs';
import {
  mapGenres,
  mergeGenres,
  currentGenres,
  extractData,
  refreshGenreDictionary,
} from '../../scripts/enrich-catalog.mjs';

describe('sync-catalog: géneros desde el Excel', () => {
  it('conserva todos los géneros del título, no solo el primero', () => {
    const item = parseItem('P99_Mi Pelicula (My Movie) (Acción) (Aventura) [2020] [USA]')!;
    expect(item.genres).toEqual(['Acción', 'Aventura']);
    expect('genre' in item).toBe(false);
  });

  it('cae en "Sin género" cuando el título no declara ninguno', () => {
    expect(parseItem('P100_Otra (Other) [2019] [España]')!.genres).toEqual(['Sin género']);
  });

  it('normaliza, deduplica y descarta valores que no son géneros', () => {
    expect(normalizeGenres(['Acción', 'Fantacía', 'Acción'])).toEqual(['Acción', 'Fantasía']);
    expect(normalizeGenres(['Suspense', 'Acci¢n'])).toEqual(['Suspenso', 'Acción']);
    // El dataset trae países en la columna de género; no deben ensuciar el diccionario.
    expect(normalizeGenres(['Uzbekistan'])).toEqual(['Sin género']);
    expect(normalizeGenres([])).toEqual(['Sin género']);
  });

  it('tolera el formato antiguo (genre string) al releer el catálogo', () => {
    expect(itemGenres({ genre: 'Drama' })).toEqual(['Drama']);
    expect(itemGenres({ genres: ['Drama', 'Terror'] })).toEqual(['Drama', 'Terror']);
  });
});

describe('enrich-catalog: géneros desde TMDB', () => {
  it('mapea por ID, no por el nombre localizado de TMDB', () => {
    // TMDB devuelve "Animación"; nuestro vocabulario dice "Animado".
    expect(mapGenres([{ id: 16, name: 'Animación' }])).toEqual(['Animado']);
    expect(mapGenres([{ id: 878 }, { id: 53 }])).toEqual(['Ciencia Ficción', 'Suspenso']);
  });

  it('expande los géneros combinados de series a varios géneros nuestros', () => {
    expect(mapGenres([{ id: 10759 }, { id: 10765 }])).toEqual([
      'Acción',
      'Aventura',
      'Ciencia Ficción',
      'Fantasía',
    ]);
  });

  it('descarta lo que no es género y los IDs desconocidos', () => {
    expect(mapGenres([{ id: 10770 }])).toEqual([]); // "Película de TV" es formato
    expect(mapGenres([{ id: 999999 }])).toEqual([]);
    expect(mapGenres(undefined)).toEqual([]);
  });

  it('no duplica géneros', () => {
    expect(mapGenres([{ id: 16 }, { id: 16 }])).toEqual(['Animado']);
  });

  it('fusiona respetando los del catálogo y soltando "Sin género"', () => {
    expect(mergeGenres(['Drama'], ['Suspenso'])).toEqual(['Drama', 'Suspenso']);
    expect(mergeGenres(['Sin género'], ['Terror'])).toEqual(['Terror']);
    expect(mergeGenres(['Drama'], ['Drama'])).toEqual(['Drama']);
    // Nunca queda vacío: la vista y los índices asumen al menos un valor.
    expect(mergeGenres(['Sin género'], [])).toEqual(['Sin género']);
  });

  it('expone los géneros junto al resto del enriquecimiento', () => {
    const details = {
      poster_path: '/x.jpg',
      overview: 'd',
      vote_average: 7,
      genres: [{ id: 18 }],
      credits: {},
      videos: {},
    };
    expect(extractData(null, details).genres).toEqual(['Drama']);
  });

  it('incorpora al diccionario global los géneros nuevos que aporta TMDB', () => {
    const catalog = {
      genres: ['Drama'],
      items: [{ genres: ['Terror', 'Drama'] }, { genre: 'Western' }],
    };
    refreshGenreDictionary(catalog);
    expect(catalog.genres).toEqual(['Drama', 'Terror', 'Western']);
  });

  it('currentGenres tolera ambos formatos', () => {
    expect(currentGenres({ genre: 'Drama' })).toEqual(['Drama']);
    expect(currentGenres({ genres: ['A', 'B'] })).toEqual(['A', 'B']);
    expect(currentGenres({})).toEqual([]);
  });
});
