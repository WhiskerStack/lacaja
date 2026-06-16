// Genera, en build-time, los dos índices de búsqueda en public/ desde el catálogo sincronizado
// (src/data/catalog.json, producido por scripts/sync-catalog.mjs).
// (Sin shebang: este módulo lo importa también tests/unit/search-index.test.ts y el transform
// de Vite no admite `#!`; se ejecuta como `node scripts/build-search-index.mjs`.)
// Formato nivel 1 (especificaciones §4.4): diccionarios + tuplas posicionales.
//   - search-index.json:  { v, items: [[code, title], ...] }            (autocomplete, minúsculo)
//   - library-index.json: { v, genres, regions, languages,
//                           items: [[code, title, year, gi, ri, li], ...] }  (filtros de Biblioteca)
// Ambos se generan en el mismo pass desde la misma fuente, garantizando consistencia (§4.5).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE = resolve(ROOT, 'src/data/catalog.json');
const OUT_DIR = resolve(ROOT, 'public');

/** Letra inicial del código (funcional §2.1): P película, S episódico. */
function typeLetter(type) {
  return type === 'movie' ? 'P' : 'S';
}
function audiovisualCode(type, id) {
  return `${typeLetter(type)}${String(id).padStart(4, '0')}`;
}

function buildIndices() {
  const catalog = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const items = catalog.items ?? [];

  // Diccionarios: índices estables para que las tuplas referencien por posición.
  const genres = catalog.genres ?? [];
  const regions = catalog.regions ?? [];
  const languages = catalog.languages ?? [];
  const gi = (name) => Math.max(0, genres.indexOf(name));
  const ri = (name) => Math.max(0, regions.indexOf(name));
  const li = (name) => Math.max(0, languages.indexOf(name));

  // Solo el item completo entra al índice; no temporadas ni capítulos (funcional §6.4.2).
  const searchItems = items.map((it) => [audiovisualCode(it.type, it.id), it.name]);

  const libraryItems = items.map((it) => [
    audiovisualCode(it.type, it.id),
    it.name,
    it.year,
    it.type,
    gi(it.genre),
    ri(it.region),
    li(it.language),
  ]);

  const searchIndex = { v: 1, items: searchItems };
  const libraryIndex = { v: 1, genres, regions, languages, items: libraryItems };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, 'search-index.json'), JSON.stringify(searchIndex));
  writeFileSync(resolve(OUT_DIR, 'library-index.json'), JSON.stringify(libraryIndex));

  return { count: items.length };
}

const { count } = buildIndices();
// eslint-disable-next-line no-console
console.log(`[dahem] Índices de búsqueda generados (${count} items) → public/search-index.json, public/library-index.json`);

export { buildIndices };
