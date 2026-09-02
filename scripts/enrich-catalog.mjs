#!/usr/bin/env node
// scripts/enrich-catalog.mjs
// Enriquece el catálogo con datos de TMDB: póster, descripción, reparto, tráiler, rating.
// Solo procesa ítems que no tengan enriched: true (con --force los reprocesa todos).
// Lee catalog.json, escribe los cambios y lo guarda periódicamente.
// Necesita TMDB_API_KEY en .env
//
// El año del catálogo se usa como filtro de verdad, no como adorno: se consulta el endpoint del
// tipo correspondiente (search/movie o search/tv), que son los únicos que admiten filtro por año
// —search/multi lo ignora—, y entre los candidatos se elige por cercanía al año antes que por
// popularidad. Sin eso, títulos repetidos ("Dune", "Mufasa", cualquier remake) se enriquecían con
// la versión más popular en vez de con la del catálogo.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Un ítem del catálogo es 'movie' o 'series'; TMDB llama 'tv' a lo segundo.
const tmdbMediaType = (type) => (type === 'movie' ? 'movie' : 'tv');

/** Año de estreno de un resultado de TMDB (las series lo traen en first_air_date). */
export function resultYear(result) {
  const date = result.release_date || result.first_air_date || '';
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

/**
 * Elige el mejor candidato de una búsqueda. El año manda sobre la popularidad: gana el más
 * cercano al del catálogo, y la popularidad solo desempata entre candidatos igual de cercanos
 * (la ficha del proveedor y TMDB discrepan a menudo en un año por estreno regional o por año de
 * producción). Sin año en el catálogo se ordena por popularidad, que es lo único disponible.
 */
export function pickBestMatch(results, { year, mediaType } = {}) {
  const candidates = (results || []).filter((r) => {
    // search/multi devuelve también personas: nunca son un audiovisual.
    if (r.media_type === 'person') return false;
    if (mediaType && r.media_type && r.media_type !== mediaType) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  if (!year) {
    return [...candidates].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
  }

  // Distancia al año pedido; sin fecha, se trata como lejano pero no descartable.
  const distance = (r) => {
    const y = resultYear(r);
    return y === null ? Number.MAX_SAFE_INTEGER : Math.abs(y - year);
  };
  return [...candidates].sort((a, b) => {
    const byYear = distance(a) - distance(b);
    return byYear !== 0 ? byYear : (b.popularity ?? 0) - (a.popularity ?? 0);
  })[0];
}

/** Llamada a TMDB con reintento ante 429. */
async function tmdbFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      await sleep(1000);
      return tmdbFetch(url);
    }
    throw new Error(`TMDB search error: ${res.status}`);
  }
  return res.json();
}

/**
 * Busca en TMDB priorizando el endpoint del tipo del ítem, que es el único que filtra por año
 * (primary_release_year en películas, first_air_date_year en series). Si no da resultados, se
 * relaja: mismo endpoint sin año, luego el otro tipo, y por último search/multi.
 */
export async function searchTMDB(query, { year, type } = {}) {
  const q = encodeURIComponent(query);
  const key = `api_key=${TMDB_API_KEY}`;
  const primary = tmdbMediaType(type);
  const secondary = primary === 'movie' ? 'tv' : 'movie';
  const yearParam = (mediaType) =>
    year ? `&${mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year'}=${year}` : '';

  const attempts = [
    year ? { mediaType: primary, url: `https://api.themoviedb.org/3/search/${primary}?${key}&query=${q}${yearParam(primary)}` } : null,
    { mediaType: primary, url: `https://api.themoviedb.org/3/search/${primary}?${key}&query=${q}` },
    year ? { mediaType: secondary, url: `https://api.themoviedb.org/3/search/${secondary}?${key}&query=${q}${yearParam(secondary)}` } : null,
    { mediaType: null, url: `https://api.themoviedb.org/3/search/multi?${key}&query=${q}` },
  ].filter(Boolean);

  for (const attempt of attempts) {
    const data = await tmdbFetch(attempt.url);
    const results = (data.results || []).map((r) => ({
      ...r,
      // search/movie y search/tv no rellenan media_type; se conoce por el endpoint usado.
      media_type: r.media_type || attempt.mediaType || undefined,
    }));
    if (results.length > 0) return results;
  }
  return [];
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
  return { poster, description, rating, cast, trailers };
}

// Procesar un ítem del catálogo (solo si no está enriquecido)
export async function enrichItem(item, { force = false } = {}) {
  // Si ya está enriquecido (true), no hacer nada
  if (item.enriched === true && !force) {
    return { changed: false };
  }

  if (force) delete item.translated;

  const { name, enName, year, type } = item;
  const queries = [];
  if (enName && enName.trim()) queries.push(enName);
  if (name && name.trim()) queries.push(name);

  let found = false;
  let mediaType = null;
  let tmdbId = null;
  let details = null;
  let matchedYear = null;

  // Se juntan los resultados de ambos títulos y se ordenan por cercanía al año: antes bastaba con
  // que la primera consulta devolviera algo, aunque fuera de otro año, y la segunda ni se miraba.
  const pool = [];
  for (const q of queries) {
    const results = await searchTMDB(q, { year, type });
    for (const r of results) {
      if (!pool.some((p) => p.id === r.id && p.media_type === r.media_type)) pool.push(r);
    }
  }

  // Preferencia por el tipo del catálogo; si con ese filtro no queda nada, se acepta cualquiera.
  const ranked = [];
  const rank = (opts) => {
    const rest = [...pool];
    let next;
    while ((next = pickBestMatch(rest, opts))) {
      rest.splice(rest.indexOf(next), 1);
      if (!ranked.includes(next)) ranked.push(next);
    }
  };
  rank({ year, mediaType: tmdbMediaType(type) });
  rank({ year });

  // Se prueba con los mejores por orden: si los detalles de uno fallan, se sigue con el siguiente.
  for (const candidate of ranked.slice(0, 3)) {
    mediaType = candidate.media_type || (candidate.first_air_date ? 'tv' : 'movie');
    tmdbId = candidate.id;
    matchedYear = resultYear(candidate);
    try {
      details = await getDetails(mediaType, tmdbId);
      found = true;
      break;
    } catch {
      continue;
    }
  }

  if (found && year && matchedYear && Math.abs(matchedYear - year) > 1) {
    // No se descarta —puede ser el único candidato— pero queda registrado para revisarlo.
    console.warn(
      `[enrich] ⚠ ${item.code} ${name}: catálogo ${year} vs TMDB ${matchedYear} (${mediaType}/${tmdbId})`
    );
  }

  if (!found) {
    console.log(`[enrich] No encontrado: ${name} (${enName})`);
    // Marcar como procesado (aunque sin datos) para no repetir
    item.enriched = true;
    return { changed: true };
  }

  const { poster, description, rating, cast, trailers } = extractData(null, details);

  let changed = false;
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

  if (!item.enriched) {
    item.enriched = true;
    changed = true;
  }

  console.log(
    `[enrich] ${item.code} ${item.name} (${year ?? 's/a'}) → TMDB ${matchedYear ?? 's/a'} · ${changed ? 'actualizado' : 'sin cambios'}`
  );
  return { changed };
}

async function main() {
  if (!TMDB_API_KEY) {
    console.error(
      '[dahem] ERROR: Falta TMDB_API_KEY en .env. Obtén una clave gratuita en themoviedb.org y añádela.'
    );
    process.exit(1);
  }

  // --force reprocesa también los ya enriquecidos: necesario para reparar fichas emparejadas con
  // el criterio anterior, que ignoraba el año.
  const force = process.argv.includes('--force');
  const catalog = readCatalog();
  const items = catalog.items || [];

  // Filtrar solo los ítems que no están enriquecidos (con --force, todos)
  const pendingItems = force ? items : items.filter((item) => item.enriched !== true);
  console.log(
    `[dahem] Total: ${items.length} ítems, por procesar: ${pendingItems.length}${force ? ' (--force)' : ''}`
  );

  let totalChanged = 0;
  let batchSize = 20;
  let changedInBatch = 0;

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    try {
      const result = await enrichItem(item, { force });
      if (result.changed) {
        totalChanged++;
        changedInBatch++;
      }
    } catch (err) {
      console.error(`[enrich] Error al procesar ${item.code}:`, err.message);
      // Si falla, lo marcamos como enriched para no repetir
      if (!item.enriched) {
        item.enriched = true;
        changedInBatch++;
      }
    }

    if (changedInBatch >= batchSize) {
      saveCatalog(catalog);
      console.log(`[dahem] Progreso guardado (${i + 1}/${pendingItems.length})`);
      changedInBatch = 0;
    }

    await sleep(250);
  }

  saveCatalog(catalog);
  console.log(`[dahem] Enriquecimiento completado. ${totalChanged} ítems actualizados.`);
}

// Solo se ejecuta al invocarlo como script; al importarlo (tests) se exponen las funciones puras.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[dahem] Error fatal:', err);
    process.exit(1);
  });
}