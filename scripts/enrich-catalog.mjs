#!/usr/bin/env node
// scripts/enrich-catalog.mjs
// Enriquece el catálogo con datos de TMDB: póster, descripción, reparto, tráiler, rating y géneros.
// Los géneros llevan su propio flag (genresEnriched) porque se añadieron después de que el catálogo
// quedara marcado con enriched: true; sin él ningún ítem existente volvería a pasar por TMDB.
// Lee catalog.json, escribe los cambios y lo guarda periódicamente.
// Necesita TMDB_API_KEY en .env

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Cargar variables de entorno desde .env
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  try {
    const content = readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        env[key] = value;
      }
    });
    return env;
  } catch {
    return {};
  }
}
const env = loadEnv();
const TMDB_API_KEY = env.TMDB_API_KEY;

const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Géneros TMDB → vocabulario del catálogo. Se mapea por ID numérico (estable) y no por el
// nombre localizado, que TMDB puede cambiar y además no coincide con nuestra nomenclatura
// ("Ciencia ficción" vs "Ciencia Ficción", "Animación" vs "Animado").
// Un ID puede expandirse a varios géneros nuestros (los combinados de TV).
const TMDB_GENRE_MAP = {
  // Películas
  28: ['Acción'],
  12: ['Aventura'],
  16: ['Animado'],
  35: ['Comedia'],
  80: ['Crimen'],
  99: ['Documental'],
  18: ['Drama'],
  10751: ['Familiar'],
  14: ['Fantasía'],
  36: ['Histórico'],
  27: ['Terror'],
  10402: ['Música'],
  9648: ['Misterio'],
  10749: ['Romance'],
  878: ['Ciencia Ficción'],
  10770: [], // "Película de TV": formato, no género; se descarta.
  53: ['Suspenso'],
  10752: ['Guerra'],
  37: ['Western'],
  // Series
  10759: ['Acción', 'Aventura'],
  10762: ['Infantil'],
  10763: ['Noticias'],
  10764: ['Reality'],
  10765: ['Ciencia Ficción', 'Fantasía'],
  10766: ['Telenovela'],
  10767: ['Talk Show'],
  10768: ['Guerra', 'Política'],
};

/** Traduce los géneros de TMDB al vocabulario del catálogo, sin duplicados y en orden estable. */
function mapGenres(tmdbGenres) {
  const out = [];
  for (const g of tmdbGenres || []) {
    for (const name of TMDB_GENRE_MAP[g.id] ?? []) {
      if (!out.includes(name)) out.push(name);
    }
  }
  return out;
}

// Leer catálogo
function readCatalog() {
  const raw = readFileSync(CATALOG_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveCatalog(data) {
  writeFileSync(CATALOG_PATH, JSON.stringify(data, null, 2));
}

// Esperar ms
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Búsqueda en TMDB (multi: películas y series)
async function searchTMDB(query, year) {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    query
  )}&year=${year || ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      await sleep(1000);
      return searchTMDB(query, year);
    }
    throw new Error(`TMDB search error: ${res.status}`);
  }
  const data = await res.json();
  return data.results || [];
}

// Obtener detalles de una película o serie (incluye créditos y vídeos)
async function getDetails(mediaType, id) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      await sleep(1000);
      return getDetails(mediaType, id);
    }
    throw new Error(`TMDB details error: ${res.status}`);
  }
  return res.json();
}

// Extraer los datos que nos interesan de la respuesta de TMDB
function extractData(tmdbItem, details) {
  const poster = details.poster_path
    ? `${TMDB_IMAGE_BASE}${details.poster_path}`
    : '';
  const description = details.overview || '';
  const rating = details.vote_average || 0;
  const cast = (details.credits?.cast || [])
    .slice(0, 5)
    .map((actor) => actor.name);
  const trailers = (details.videos?.results || [])
    .filter((v) => v.site === 'YouTube' && v.type === 'Trailer')
    .map((v) => v.key);
  const genres = mapGenres(details.genres);
  return { poster, description, rating, cast, trailers, genres };
}

/** Géneros del ítem, tolerando el formato antiguo (`genre` string) de catálogos sin migrar. */
function currentGenres(item) {
  if (Array.isArray(item.genres)) return item.genres;
  if (item.genre) return [item.genre];
  return [];
}

/**
 * Fusiona los géneros de TMDB con los que ya tiene el ítem.
 * Los del catálogo mandan en el orden (vienen del Excel y suelen ser los que el negocio usa),
 * y "Sin género" se cae en cuanto TMDB aporta alguno real.
 */
function mergeGenres(existing, incoming) {
  const base = existing.filter((g) => g && g !== 'Sin género');
  const out = [...base];
  for (const g of incoming) {
    if (!out.includes(g)) out.push(g);
  }
  return out.length ? out : ['Sin género'];
}

// Procesar un ítem del catálogo.
// Dos ejes independientes: el enriquecimiento general (enriched) y el de géneros
// (genresEnriched). Un ítem ya enriquecido antes de que existieran los géneros vuelve a
// consultarse, pero solo se le tocan los géneros.
async function enrichItem(item) {
  const needsFull = item.enriched !== true;
  const needsGenres = item.genresEnriched !== true;
  if (!needsFull && !needsGenres) {
    return { changed: false };
  }

  const { name, enName, year } = item;
  const queries = [];
  if (enName && enName.trim()) queries.push(enName);
  if (name && name.trim()) queries.push(name);

  let found = false;
  let mediaType = null;
  let tmdbId = null;
  let details = null;

  for (const q of queries) {
    const results = await searchTMDB(q, year);
    const exactYearMatch = results.find(
      (r) => r.release_date && r.release_date.startsWith(String(year))
    );
    const best = exactYearMatch || results[0];
    if (best) {
      mediaType = best.media_type || (best.first_air_date ? 'tv' : 'movie');
      tmdbId = best.id;
      try {
        details = await getDetails(mediaType, tmdbId);
        found = true;
        break;
      } catch {
        continue;
      }
    }
  }

  if (!found) {
    console.log(`[enrich] No encontrado: ${name} (${enName})`);
    // Marcar como procesado (aunque sin datos) para no repetir
    item.enriched = true;
    item.genresEnriched = true;
    return { changed: true };
  }

  const { poster, description, rating, cast, trailers, genres } = extractData(null, details);

  let changed = false;

  if (needsFull) {
    if (poster && poster !== item.imageUrl) {
      item.imageUrl = poster;
      changed = true;
    }
    if (description && description !== item.description) {
      item.description = description;
      changed = true;
    }
    if (rating && rating !== item.rating) {
      item.rating = rating;
      changed = true;
    }
    if (cast.length && JSON.stringify(cast) !== JSON.stringify(item.cast || [])) {
      item.cast = cast;
      changed = true;
    }
    if (
      trailers.length &&
      JSON.stringify(trailers) !== JSON.stringify(item.trailers || [])
    ) {
      item.trailers = trailers;
      changed = true;
    }
  }

  if (needsGenres) {
    const merged = mergeGenres(currentGenres(item), genres);
    if (JSON.stringify(merged) !== JSON.stringify(item.genres || [])) {
      item.genres = merged;
      changed = true;
    }
    // El campo antiguo se retira: la vista y los índices leen `genres`.
    if ('genre' in item) {
      delete item.genre;
      changed = true;
    }
    item.genresEnriched = true;
    changed = true;
  }

  if (!item.enriched) {
    item.enriched = true;
    changed = true;
  }

  console.log(
    `[enrich] ${item.code} ${item.name} → ${changed ? 'actualizado' : 'sin cambios'}` +
      (needsGenres ? ` [géneros: ${(item.genres || []).join(', ')}]` : '')
  );
  return { changed };
}

/** Recalcula el diccionario global de géneros a partir de los ítems (los nuevos de TMDB entran aquí). */
function refreshGenreDictionary(catalog) {
  const set = new Set(catalog.genres ?? []);
  for (const item of catalog.items ?? []) {
    for (const g of currentGenres(item)) set.add(g);
  }
  catalog.genres = Array.from(set)
    .filter((g) => g && isNaN(g))
    .sort((a, b) => a.localeCompare(b, 'es'));
}

async function main() {
  if (!TMDB_API_KEY) {
    console.error(
      '[dahem] ERROR: Falta TMDB_API_KEY en .env. Obtén una clave gratuita en themoviedb.org y añádela.'
    );
    process.exit(1);
  }

  const catalog = readCatalog();
  const items = catalog.items || [];

  // Pendientes: los que no están enriquecidos, o los que aún no pasaron por el enriquecido de géneros.
  const pendingItems = items.filter(
    (item) => item.enriched !== true || item.genresEnriched !== true
  );
  console.log(`[dahem] Total: ${items.length} ítems, pendientes: ${pendingItems.length}`);

  let totalChanged = 0;
  let batchSize = 20;
  let changedInBatch = 0;

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    try {
      const result = await enrichItem(item);
      if (result.changed) {
        totalChanged++;
        changedInBatch++;
      }
    } catch (err) {
      console.error(`[enrich] Error al procesar ${item.code}:`, err.message);
      // Si falla, lo marcamos como procesado para no repetir
      if (!item.enriched || !item.genresEnriched) {
        item.enriched = true;
        item.genresEnriched = true;
        changedInBatch++;
      }
    }

    if (changedInBatch >= batchSize) {
      refreshGenreDictionary(catalog);
      saveCatalog(catalog);
      console.log(`[dahem] Progreso guardado (${i + 1}/${pendingItems.length})`);
      changedInBatch = 0;
    }

    await sleep(250);
  }

  refreshGenreDictionary(catalog);
  saveCatalog(catalog);
  console.log(`[dahem] Enriquecimiento completado. ${totalChanged} ítems actualizados.`);
}

// Las funciones puras se exportan para tests/unit/genres.test.ts.
export { mapGenres, mergeGenres, currentGenres, extractData, refreshGenreDictionary };

// Solo se ejecuta como CLI (`node scripts/enrich-catalog.mjs`), no al importarse.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[dahem] Error fatal:', err);
    process.exit(1);
  });
}