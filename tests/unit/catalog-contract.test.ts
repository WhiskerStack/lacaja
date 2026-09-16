// Tests de contrato del catálogo serializado (src/data/catalog.json).
// Definen la estructura esperada del archivo que produce scripts/sync-catalog.mjs
// y que consume buildData.ts en build-time. Si el contrato cambia, este test
// falla antes de que la app levante con un JSON malformado.
//
// El archivo pesa ~860 KB y trae 700+ ítems, así que se lee una sola vez al cargar
// el módulo y se reutiliza entre tests (vitest lo cachea por archivo).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// `import` directo del JSON funcionaría, pero vite lo copia al cache de pruebas
// y el aserto "el archivo existe y es parseable" deja de tener sentido. Leemos
// del disco como hace sync-catalog.mjs al escribirlo.
const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(__dirname, '../../src/data/catalog.json');

interface Catalog {
  version: number;
  genres: string[];
  regions: string[];
  languages: string[];
  items: CatalogItem[];
}

interface CatalogItem {
  id: string;
  type: 'movie' | 'series';
  name: string;
  enName?: string;
  year: number | null;
  rating: number;
  sizeGb: number;
  isPremiere: boolean;
  genres: string[];
  region: string;
  language: string;
  description: string;
  imageUrl: string;
  cast: string[];
  trailers: string[];
  seasons: unknown[];
  seasonCount: number;
  episodeCount: number;
  code: string;
  isActive?: boolean;
  metadata?: Record<string, boolean>;
}

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as Catalog;

describe('catalog.json: archivo', () => {
  it('existe y es JSON parseable', () => {
    expect(catalog).toBeTypeOf('object');
  });
});

describe('catalog.json: raíz', () => {
  it('tiene exactamente las claves esperadas en la raíz', () => {
    expect(Object.keys(catalog).sort()).toEqual(
      ['genres', 'items', 'languages', 'regions', 'version'].sort(),
    );
  });

  it('version es un número positivo (semver-like, no necesariamente entero)', () => {
    expect(typeof catalog.version).toBe('number');
    expect(catalog.version).toBeGreaterThan(0);
    expect(Number.isFinite(catalog.version)).toBe(true);
  });

  it('genres es un arreglo de strings no vacío', () => {
    expect(Array.isArray(catalog.genres)).toBe(true);
    expect(catalog.genres.length).toBeGreaterThan(0);
    for (const g of catalog.genres) expect(typeof g).toBe('string');
  });

  it('regions es un arreglo de strings no vacío', () => {
    expect(Array.isArray(catalog.regions)).toBe(true);
    expect(catalog.regions.length).toBeGreaterThan(0);
    for (const r of catalog.regions) expect(typeof r).toBe('string');
  });

  it('languages es un arreglo de strings no vacío', () => {
    expect(Array.isArray(catalog.languages)).toBe(true);
    expect(catalog.languages.length).toBeGreaterThan(0);
    for (const l of catalog.languages) expect(typeof l).toBe('string');
  });

  it('items es un arreglo y trae al menos un audiovisual', () => {
    expect(Array.isArray(catalog.items)).toBe(true);
    expect(catalog.items.length).toBeGreaterThan(0);
  });
});

describe('catalog.json: items', () => {
  it('cada item tiene los campos obligatorios del modelo audiovisual', () => {
    for (const item of catalog.items) {
      // Identidad y tipo
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(['movie', 'series']).toContain(item.type);

      // Datos básicos
      expect(typeof item.name).toBe('string');
      expect(item.name.length).toBeGreaterThan(0);
      // enName puede faltar o llegar vacío (títulos sin alternativa)
      if (item.enName !== undefined) expect(typeof item.enName).toBe('string');

      expect(typeof item.year === 'number' || item.year === null).toBe(true);
      expect(typeof item.rating).toBe('number');
      expect(typeof item.sizeGb).toBe('number');
      expect(typeof item.isPremiere).toBe('boolean');
    }
  });

  it('cada item tiene los campos de clasificación y metadatos', () => {
    for (const item of catalog.items) {
      expect(Array.isArray(item.genres)).toBe(true);
      // buildData.ts garantiza al menos un valor (default 'Sin género')
      expect(item.genres.length).toBeGreaterThan(0);

      expect(typeof item.region).toBe('string');
      expect(item.region.length).toBeGreaterThan(0);

      expect(typeof item.language).toBe('string');
      expect(item.language.length).toBeGreaterThan(0);

      expect(typeof item.description).toBe('string');

      expect(typeof item.imageUrl).toBe('string');
      expect(item.imageUrl.length).toBeGreaterThan(0);

      expect(Array.isArray(item.cast)).toBe(true);
      expect(Array.isArray(item.trailers)).toBe(true);
      expect(Array.isArray(item.seasons)).toBe(true);
    }
  });

  it('cada item tiene los contadores y el código en formato esperado', () => {
    for (const item of catalog.items) {
      expect(typeof item.seasonCount).toBe('number');
      expect(typeof item.episodeCount).toBe('number');

      // El código sigue el patrón "<P|S><número>" (funcional §2.1).
      // El prefijo P identifica películas, S identifica episódicos.
      expect(item.code).toMatch(/^[PS]\d+$/);
      if (item.type === 'movie') expect(item.code.startsWith('P')).toBe(true);
      if (item.type === 'series') expect(item.code.startsWith('S')).toBe(true);
    }
  });

  it('los códigos son únicos dentro del catálogo (identidad de catálogo)', () => {
    const codes = catalog.items.map((i) => i.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('los ids son únicos (PK lógica para backend)', () => {
    const ids = catalog.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('isActive, si está presente, es booleano (filtro de desactivados en buildData)', () => {
    for (const item of catalog.items) {
      if (item.isActive !== undefined) expect(typeof item.isActive).toBe('boolean');
    }
  });

  it('metadata, si está presente, es un objeto de banderas booleanas', () => {
    const knownFlags = ['enriched', 'translated', 'genresEnriched', 'titlesChecked'];
    for (const item of catalog.items) {
      if (item.metadata === undefined) continue;
      expect(typeof item.metadata).toBe('object');
      for (const [key, value] of Object.entries(item.metadata)) {
        expect(knownFlags).toContain(key);
        expect(typeof value).toBe('boolean');
      }
    }
  });

  it('rating, sizeGb y los contadores son números finitos no negativos', () => {
    for (const item of catalog.items) {
      expect(Number.isFinite(item.rating)).toBe(true);
      expect(item.rating).toBeGreaterThanOrEqual(0);

      expect(Number.isFinite(item.sizeGb)).toBe(true);
      expect(item.sizeGb).toBeGreaterThanOrEqual(0);

      expect(Number.isFinite(item.seasonCount)).toBe(true);
      expect(item.seasonCount).toBeGreaterThanOrEqual(0);

      expect(Number.isFinite(item.episodeCount)).toBe(true);
      expect(item.episodeCount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('catalog.json: vocabularios', () => {
  it('cada genre de los items existe en la lista global de géneros', () => {
    // 'Sin género' es el fallback por defecto y no se lista arriba.
    const vocabulary = new Set(catalog.genres);
    vocabulary.add('Sin género');
    for (const item of catalog.items) {
      for (const g of item.genres) expect(vocabulary.has(g)).toBe(true);
    }
  });

  it('cada region de los items existe en la lista global de regiones', () => {
    const vocabulary = new Set(catalog.regions);
    const huérfanas = new Set<string>();
    for (const item of catalog.items) {
      if (!vocabulary.has(item.region)) huérfanas.add(item.region);
    }
    // Si esto falla, enrich-catalog.mjs introdujo una región que no se ha añadido
    // al vocabulario (catalog.regions) — el test expone la lista para acelerar el fix.
    expect([...huérfanas].sort()).toEqual([]);
  });

  it('cada language de los items existe en la lista global de idiomas', () => {
    const vocabulary = new Set(catalog.languages);
    for (const item of catalog.items) expect(vocabulary.has(item.language)).toBe(true);
  });
});