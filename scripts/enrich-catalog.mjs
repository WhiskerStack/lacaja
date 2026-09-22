// scripts/enrich-catalog.mjs
// Enriquece el catálogo con datos de TMDB: póster, descripción, reparto, tráiler, rating y géneros.
// Solo procesa ítems cuyo metadata.enriched no sea true (con --force los reprocesa todos).
// Los géneros llevan su propio flag (metadata.genresEnriched) porque se añadieron después de que el
// catálogo quedara marcado con enriched; sin él ningún ítem existente volvería a pasar por TMDB.
// Las banderas de proceso viven agrupadas en item.metadata (ver scripts/lib/metadata.mjs).
// Lee catalog.json, escribe los cambios y lo guarda periódicamente.
// Necesita TMDB_API_KEY en .env
//
// El año del catálogo se usa como filtro de verdad, no como adorno: se consulta el endpoint del
// tipo correspondiente (search/movie o search/tv), que son los únicos que admiten filtro por año
// —search/multi lo ignora—, y entre los candidatos se elige por cercanía al año antes que por
// popularidad. Sin eso, títulos repetidos ("Dune", "Mufasa", cualquier remake) se enriquecían con
// la versión más popular en vez de con la del catálogo.
//
// El país del catálogo (`region`) acota todavía más el emparejamiento. TMDB no admite filtrar la
// búsqueda por país de origen, así que se aplica sobre los candidatos: en series ya viene en el
// resultado (origin_country) y en películas hay que mirar los detalles (production_countries). Por
// eso el país desempata dentro de la misma cercanía de año en vez de mandar sobre ella: la region
// del dataset es orientativa (coproducciones, "EU" por Estados Unidos, valores basura) y descartar
// por ella dejaría ítems sin enriquecer.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  hasFlag,
  setFlag,
  setFlags,
  normalizeItemMetadata,
  normalizeCatalogMetadata,
} from './lib/metadata.mjs';

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

// Region del catálogo → ISO 3166-1 alpha-2, que es como TMDB nombra los países. El dataset
// escribe los países en castellano y con ruido: "EU" es Estados Unidos (no la Unión Europea),
// conviven "EU" y "USA", y algunas filas mal parseadas dejaron un año en el campo. Lo que no
// esté aquí (incluido "Desconocido") no se usa como criterio: sin país, el match se decide como
// antes, por año y popularidad.
export const REGION_TO_ISO = {
  Alemania: 'DE',
  Argentina: 'AR',
  Australia: 'AU',
  Brasil: 'BR',
  Brazil: 'BR',
  Canada: 'CA',
  Canadá: 'CA',
  'Corea del Sur': 'KR',
  España: 'ES',
  Estonia: 'EE',
  'Estados Unidos': 'US',
  EU: 'US',
  Francia: 'FR',
  Irlanda: 'IE',
  Mexico: 'MX',
  México: 'MX',
  'Nueva Zelanda': 'NZ',
  'Países Bajos': 'NL',
  'Reino Unido': 'GB',
  'República Dominicana': 'DO',
  Rusia: 'RU',
  Sudáfrica: 'ZA',
  Suecia: 'SE',
  Tailandia: 'TH',
  Turquía: 'TR',
  Uruguay: 'UY',
  US: 'US',
  USA: 'US',
};

/** País del ítem en ISO 3166-1, o null si la region no sirve para filtrar (vacía, un año, sin mapear). */
export function regionToIso(region) {
  if (region === null || region === undefined) return null;
  const trimmed = String(region).trim();
  if (!trimmed || /^\d+$/.test(trimmed)) return null;
  return REGION_TO_ISO[trimmed] ?? null;
}

/**
 * Países de un candidato o de sus detalles, en ISO 3166-1. Las series los traen en origin_country
 * (también en el resultado de búsqueda); las películas, en production_countries de los detalles.
 */
export function countriesOf(source) {
  if (!source) return [];
  const production = (source.production_countries || []).map((c) => c.iso_3166_1);
  return [...new Set([...production, ...(source.origin_country || [])].filter(Boolean))];
}

/**
 * Coincidencia de país: true/false solo cuando hay dato que comparar, null si no se puede saber
 * (sin país esperado, o candidato que no declara ninguno). Null es neutro: no premia ni castiga.
 */
export function countryMatches(source, expectedIso) {
  if (!expectedIso) return null;
  const countries = countriesOf(source);
  if (countries.length === 0) return null;
  return countries.includes(expectedIso);
}

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
export function mapGenres(tmdbGenres) {
  const out = [];
  for (const g of tmdbGenres || []) {
    for (const name of TMDB_GENRE_MAP[g.id] ?? []) {
      if (!out.includes(name)) out.push(name);
    }
  }
  return out;
}

/** Géneros del ítem, tolerando el formato antiguo (`genre` string) de catálogos sin migrar. */
export function currentGenres(item) {
  if (Array.isArray(item.genres)) return item.genres;
  if (item.genre) return [item.genre];
  return [];
}

/**
 * Fusiona los géneros de TMDB con los que ya tiene el ítem.
 * Los del catálogo mandan en el orden (vienen del Excel y suelen ser los que el negocio usa),
 * y "Sin género" se cae en cuanto TMDB aporta alguno real.
 */
export function mergeGenres(existing, incoming) {
  const out = existing.filter((g) => g && g !== 'Sin género');
  for (const g of incoming) {
    if (!out.includes(g)) out.push(g);
  }
  return out.length ? out : ['Sin género'];
}

/** Recalcula el diccionario global de géneros a partir de los ítems (los nuevos de TMDB entran aquí). */
export function refreshGenreDictionary(catalog) {
  const set = new Set(catalog.genres ?? []);
  for (const item of catalog.items ?? []) {
    for (const g of currentGenres(item)) set.add(g);
  }
  catalog.genres = Array.from(set)
    .filter((g) => g && isNaN(g))
    .sort((a, b) => a.localeCompare(b, 'es'));
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
 *
 * Con `expectedIso` el país se cuela como desempate por delante de la popularidad, pero siempre
 * por detrás del año: un candidato del país correcto gana a otro igual de cercano en año y más
 * popular ("The Office" de 2005 estadounidense frente a la británica). Aquí solo hay dato de país
 * en las series; en películas lo aplica enrichItem sobre los detalles.
 */
export function pickBestMatch(results, { year, mediaType, expectedIso } = {}) {
  const candidates = (results || []).filter((r) => {
    // search/multi devuelve también personas: nunca son un audiovisual.
    if (r.media_type === 'person') return false;
    if (mediaType && r.media_type && r.media_type !== mediaType) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  // Orden de país: primero los que coinciden, al final los que declaran otro; los que no
  // declaran ninguno quedan en medio, sin premio ni castigo.
  const byCountry = (r) => {
    const match = countryMatches(r, expectedIso);
    return match === null ? 0 : match ? -1 : 1;
  };
  if (!year) {
    return [...candidates].sort(
      (a, b) => byCountry(a) - byCountry(b) || (b.popularity ?? 0) - (a.popularity ?? 0)
    )[0];
  }

  // Distancia al año pedido; sin fecha, se trata como lejano pero no descartable.
  const distance = (r) => {
    const y = resultYear(r);
    return y === null ? Number.MAX_SAFE_INTEGER : Math.abs(y - year);
  };
  return [...candidates].sort(
    (a, b) =>
      distance(a) - distance(b) ||
      byCountry(a) - byCountry(b) ||
      (b.popularity ?? 0) - (a.popularity ?? 0)
  )[0];
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
export function extractData(tmdbItem, details) {
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

// Procesar un ítem del catálogo.
// Dos ejes independientes: el enriquecimiento general (metadata.enriched) y el de géneros
// (metadata.genresEnriched). Un ítem ya enriquecido antes de que existieran los géneros vuelve a
// consultarse, pero solo se le tocan los géneros.
export async function enrichItem(item, { force = false } = {}) {
  // Tolera ítems en formato antiguo (banderas sueltas en la raíz del ítem).
  normalizeItemMetadata(item);

  const needsFull = force || !hasFlag(item, 'enriched');
  const needsGenres = force || !hasFlag(item, 'genresEnriched');
  if (!needsFull && !needsGenres) {
    return { changed: false };
  }

  if (force) setFlag(item, 'translated', false);

  const { name, enName, year, type, region } = item;
  // País esperado del catálogo; null cuando la region no sirve para filtrar.
  const expectedIso = regionToIso(region);
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
  rank({ year, mediaType: tmdbMediaType(type), expectedIso });
  rank({ year, expectedIso });

  // Se prueba con los mejores por orden: si los detalles de uno fallan, se sigue con el siguiente.
  // Con país esperado no se corta en el primero que responda: se siguen mirando los siguientes
  // hasta encontrar uno del país correcto (en películas el país solo está en los detalles), y si
  // ninguno coincide se conserva el primero, que sigue siendo el mejor por año y popularidad.
  let countryMatched = false;
  for (const candidate of ranked.slice(0, 3)) {
    const candidateMediaType =
      candidate.media_type || (candidate.first_air_date ? 'tv' : 'movie');
    let candidateDetails;
    try {
      candidateDetails = await getDetails(candidateMediaType, candidate.id);
    } catch {
      continue;
    }

    const matches = countryMatches(candidateDetails, expectedIso) === true;
    if (!found || matches) {
      mediaType = candidateMediaType;
      tmdbId = candidate.id;
      matchedYear = resultYear(candidate);
      details = candidateDetails;
      found = true;
      countryMatched = matches;
    }
    if (!expectedIso || matches) break;
  }

  if (found && expectedIso && !countryMatched) {
    // Como con el año: no se descarta —puede ser coproducción o el único candidato— pero se avisa.
    console.warn(
      `[enrich] ⚠ ${item.code} ${name}: catálogo ${region} (${expectedIso}) vs TMDB ${countriesOf(details).join('/') || 's/país'} (${mediaType}/${tmdbId})`
    );
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
    setFlags(item, ['enriched', 'genresEnriched']);
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
    setFlag(item, 'genresEnriched');
    changed = true;
  }

  if (setFlag(item, 'enriched')) {
    changed = true;
  }

  console.log(
    `[enrich] ${item.code} ${item.name} (${year ?? 's/a'}) → TMDB ${matchedYear ?? 's/a'} · ${changed ? 'actualizado' : 'sin cambios'}` +
      (needsGenres ? ` [géneros: ${(item.genres || []).join(', ')}]` : '')
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

  // Absorbe las banderas sueltas del formato antiguo antes de decidir qué está pendiente.
  normalizeCatalogMetadata(catalog);

  // Pendientes: sin enriquecer, o aún sin pasar por el enriquecido de géneros (con --force, todos).
  const pendingItems = force
    ? items
    : items.filter((item) => !hasFlag(item, 'enriched') || !hasFlag(item, 'genresEnriched'));
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
      // Si falla, lo marcamos como procesado para no repetir
      if (setFlags(item, ['enriched', 'genresEnriched'])) {
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

// Solo se ejecuta al invocarlo como script; al importarlo (tests) se exponen las funciones puras.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[dahem] Error fatal:', err);
    process.exit(1);
  });
}