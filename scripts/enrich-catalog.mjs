#!/usr/bin/env node
// scripts/enrich-catalog.mjs
// Enriquece el catálogo con datos de TMDB: póster, descripción, reparto, tráiler, rating.
// Solo procesa ítems que no tengan enriched: true.
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
if (!TMDB_API_KEY) {
  console.error(
    '[dahem] ERROR: Falta TMDB_API_KEY en .env. Obtén una clave gratuita en themoviedb.org y añádela.'
  );
  process.exit(1);
}

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
  return { poster, description, rating, cast, trailers };
}

// Procesar un ítem del catálogo (solo si no está enriquecido)
async function enrichItem(item) {
  // Si ya está enriquecido (true), no hacer nada
  if (item.enriched === true) {
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

  console.log(`[enrich] ${item.code} ${item.name} → ${changed ? 'actualizado' : 'sin cambios'}`);
  return { changed };
}

async function main() {
  const catalog = readCatalog();
  const items = catalog.items || [];

  // Filtrar solo los ítems que no están enriquecidos
  const pendingItems = items.filter(item => item.enriched !== true);
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

main().catch((err) => {
  console.error('[dahem] Error fatal:', err);
  process.exit(1);
});