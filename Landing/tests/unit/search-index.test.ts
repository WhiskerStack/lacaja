// Test de la forma de salida del builder de índices (especificaciones §4.4).
import { describe, it, expect } from 'vitest';
import { buildIndices } from '../../scripts/build-search-index.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

describe('build-search-index', () => {
  it('genera ambos índices con el formato de tuplas posicionales', () => {
    const { count } = buildIndices();
    expect(count).toBeGreaterThan(0);

    const search = JSON.parse(readFileSync(resolve(ROOT, 'public/search-index.json'), 'utf8'));
    expect(search.v).toBe(1);
    expect(Array.isArray(search.items)).toBe(true);
    // Cada item: [code, title]
    expect(search.items[0]).toHaveLength(2);
    expect(typeof search.items[0][0]).toBe('string');

    const library = JSON.parse(readFileSync(resolve(ROOT, 'public/library-index.json'), 'utf8'));
    expect(library.v).toBe(1);
    expect(Array.isArray(library.genres)).toBe(true);
    // Cada item: [code, title, year, type, gi, ri, li]
    expect(library.items[0]).toHaveLength(7);
    const [code, title, year, , gi] = library.items[0];
    expect(typeof code).toBe('string');
    expect(typeof title).toBe('string');
    expect(typeof year).toBe('number');
    expect(typeof gi).toBe('number');
  });

  it('solo indexa items completos (no temporadas/capítulos, funcional §6.4.2)', () => {
    buildIndices();
    const search = JSON.parse(readFileSync(resolve(ROOT, 'public/search-index.json'), 'utf8'));
    // Ningún código contiene guion (eso sería temporada/capítulo).
    for (const [code] of search.items) {
      expect(code).not.toContain('-');
    }
  });
});
