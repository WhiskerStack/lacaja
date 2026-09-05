// Genera, en build-time, los dos índices de búsqueda en public/ desde el catálogo sincronizado
// (src/data/catalog.json, producido por scripts/sync-catalog.mjs).
// (Sin shebang: este módulo lo importa también tests/unit/search-index.test.ts y el transform
// de Vite no admite `#!`; se ejecuta como `node scripts/build-search-index.mjs`.)
// Formato nivel 1 (especificaciones §4.4): diccionarios + tuplas posicionales.
//   - search-index.json:  { v, items: [[code, title, alt?], ...] }      (autocomplete, minúsculo)
//     `alt` es el título alternativo (campo enName): unos ítems lo traen en español y otros
//     en el idioma original, así que se indexa junto al principal para poder buscar por ambos.
//   - library-index.json: { v, genres, regions, languages,
//                           items: [[code, title, year, type, gi[], ri, li], ...] }  (filtros de Biblioteca)
//     `gi` es un ARREGLO de índices: un ítem puede tener varios géneros (v2 del formato).
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
/** Código derivado del id (fallback). Mismo formato que el dominio: letra + número. */
function audiovisualCode(type, id) {
  return `${typeLetter(type)}${id}`;
}
/** Código del item: el guardado manda; se deriva del id si el sample no lo trae. */
function itemCode(it) {
  return it.code || audiovisualCode(it.type, it.id);
}

/** Clave de comparación de títulos: sin acentos, mayúsculas ni espacios de más. */
function titleKey(title) {
  return title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Título alternativo del item, solo si aporta algo distinto al principal. */
function altTitle(it) {
  const alt = (it.enName || '').trim();
  if (!alt || titleKey(alt) === titleKey(it.name)) return null;
  return alt;
}

function buildIndices() {
  const catalog = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const items = catalog.items?.filter(item => item.isActive !== false) ?? [];

  // Diccionarios: índices estables para que las tuplas referencien por posición.
  const genres = catalog.genres ?? [];
  const regions = catalog.regions ?? [];
  const languages = catalog.languages ?? [];
  const ri = (name) => Math.max(0, regions.indexOf(name));
  const li = (name) => Math.max(0, languages.indexOf(name));
  /** Índices de los géneros del ítem. Se descartan los que no estén en el diccionario
   *  en lugar de colapsarlos al índice 0, que los haría pasar por el primer género. */
  const gi = (item) => {
    const names = Array.isArray(item.genres) ? item.genres : item.genre ? [item.genre] : [];
    return names.map((n) => genres.indexOf(n)).filter((idx) => idx >= 0);
  };

  // Solo el item completo entra al índice; no temporadas ni capítulos (funcional §6.4.2).
  // La tercera posición (título alternativo) se omite cuando no la hay, para no engordar el JSON.
  const searchItems = items.map((it) => {
    const alt = altTitle(it);
    return alt ? [itemCode(it), it.name, alt] : [itemCode(it), it.name];
  });

  const libraryItems = items.map((it) => [
    itemCode(it),
    it.name,
    it.year,
    it.type,
    gi(it),
    ri(it.region),
    li(it.language),
  ]);

  const searchIndex = { v: 1, items: searchItems };
  // v2: el campo de género pasó de índice único a arreglo de índices.
  const libraryIndex = { v: 2, genres, regions, languages, items: libraryItems };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, 'search-index.json'), JSON.stringify(searchIndex));
  writeFileSync(resolve(OUT_DIR, 'library-index.json'), JSON.stringify(libraryIndex));

  return { count: items.length };
}

const { count } = buildIndices();
// eslint-disable-next-line no-console
console.log(`[dahem] Índices de búsqueda generados (${count} items) → public/search-index.json, public/library-index.json`);

export { buildIndices };
