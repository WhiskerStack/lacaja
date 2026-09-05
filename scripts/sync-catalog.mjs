#!/usr/bin/env node
// sync-catalog.mjs
// Lee todos los archivos .xlsx en dataset/ y extrae cada ítem.
// Genera src/data/catalog.json con UUIDs, año null si falta, y datos normalizados.
// Ahora: carga el catálogo existente para evitar duplicados por código.
// Nota: Ya no restaura desde catalog.sample.json.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import XLSX from 'xlsx';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATASET_DIR = resolve(ROOT, 'dataset');
const OUTPUT = resolve(ROOT, 'src/data/catalog.json');

// Conjuntos para listas únicas
const genresSet = new Set();
const regionsSet = new Set();
const languagesSet = new Set();

// Mapa de ítems por código (para evitar duplicados)
const itemsMap = new Map();

// Normalización de regiones
const regionMap = {
  'Cánada': 'Canadá',
  'Republica Dominicana': 'República Dominicana',
  'Netherlands': 'Países Bajos',
  'South Africa': 'Sudáfrica',
  'Russia': 'Rusia',
  'EU': 'EU',
  'USA': 'USA',
  'Reino Unido': 'Reino Unido',
  'España': 'España',
  'Alemania': 'Alemania',
  'Francia': 'Francia',
  'Irlanda': 'Irlanda',
  'Mexico': 'México',
  'Argentina': 'Argentina',
  'Uruguay': 'Uruguay',
  'Australia': 'Australia',
  'Nueva Zelanda': 'Nueva Zelanda',
  'Suecia': 'Suecia',
  'Tailandia': 'Tailandia',
  'Estonia': 'Estonia',
  'Desconocido': 'Desconocido',
  'Turquia': 'Turquía',
  'South Korea': 'Corea del Sur',
};

// Normalización de géneros
const genreMap = {
  'Fantacía': 'Fantasía',
  'Animados': 'Animado',
  'Futurista': 'Ciencia Ficción',
  'Desastres': 'Desastres',
  'Intriga': 'Intriga',
  'Suspenso': 'Suspenso',
  'Terror': 'Terror',
  'Horror': 'Horror',
  'Misterio': 'Misterio',
  'Thriller': 'Thriller',
  'Comedia': 'Comedia',
  'Drama': 'Drama',
  'Acción': 'Acción',
  'Aventura': 'Aventura',
  'Ciencia Ficción': 'Ciencia Ficción',
  'Romance': 'Romance',
  'Guerra': 'Guerra',
  'Documental': 'Documental',
  'Animado': 'Animado',
  'Crimen': 'Crimen',
  'Policiaco': 'Policiaco',
  'Bélica': 'Bélica',
  'Mafia': 'Mafia',
  'Aliens': 'Aliens',
  'Animales': 'Animales',
  'Espionaje': 'Espionaje',
  'Terrorismo': 'Terrorismo',
  'Zombies': 'Zombies',
  'Vampiros': 'Vampiros',
  'Samurai': 'Samurai',
  'Música': 'Música',
  'Sexualidad': 'Sexualidad',
  'Pornografía': 'Pornografía',
  'Hechos Reales': 'Hechos Reales',
  'Bibliografica': 'Biográfico',
  'Deporte': 'Deporte',
  'Wester': 'Western',
  'Superheroes': 'Superhéroes',
  'Secuestro': 'Secuestro',
  'Drogas': 'Drogas',
  'Western': 'Western',
  // Variantes sucias detectadas en el dataset (acentos rotos, minúsculas, país en la
  // columna de género). Sin esto quedan fuera del diccionario y no filtran en Biblioteca.
  'Suspense': 'Suspenso',
  'Ciencia ficción': 'Ciencia Ficción',
  'Acci¢n': 'Acción',
  'Uzbekistan': 'Sin género',
};

function normalizeRegion(region) {
  if (!region) return 'Desconocido';
  const trimmed = region.trim();
  return regionMap[trimmed] || trimmed;
}

function normalizeGenre(genre) {
  if (!genre) return 'Sin género';
  const trimmed = genre.trim();
  return genreMap[trimmed] || trimmed;
}

/**
 * Normaliza la lista de géneros de un ítem: limpia, mapea, deduplica y garantiza
 * al menos un valor. El Excel puede traer varios paréntesis de género por título.
 */
function normalizeGenres(rawGenres) {
  const out = [];
  for (const g of rawGenres || []) {
    if (!g || !String(g).trim()) continue;
    const name = normalizeGenre(String(g));
    if (name && name !== 'Sin género' && !out.includes(name)) out.push(name);
  }
  return out.length ? out : ['Sin género'];
}

/** Géneros de un ítem del catálogo previo, tolerando el formato antiguo (`genre` string). */
function itemGenres(item) {
  if (Array.isArray(item.genres)) return item.genres;
  if (item.genre) return [item.genre];
  return [];
}

function parseItem(text) {
  if (!text || typeof text !== 'string') return null;
  text = text.trim();
  if (!text) return null;

  // Extraer código (P1, S1, etc.)
  const codeMatch = text.match(/^([PS]\d+)_/);
  if (!codeMatch) return null;
  const code = codeMatch[1];
  const prefix = code[0];
  const type = prefix === 'P' ? 'movie' : 'series';
  let rest = text.slice(codeMatch[0].length);

  // Extraer año: [2023] o (2023) o 2023 suelto
  let year = null;
  const yearMatch = rest.match(/\[(\d{4})\]/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    rest = rest.replace(/\[\d{4}\]/, '');
  } else {
    // Buscar año sin corchetes
    const altYear = rest.match(/\b(19|20)\d{2}\b/);
    if (altYear) {
      year = parseInt(altYear[0], 10);
      rest = rest.replace(/\b(19|20)\d{2}\b/, '');
    }
  }

  // Extraer región: último corchete que quede
  let region = 'Desconocido';
  const regionMatch = rest.match(/\[([^\]]+)\]$/);
  if (regionMatch) {
    region = regionMatch[1];
    rest = rest.replace(/\[[^\]]+\]$/, '');
  } else {
    // intentar encontrar cualquier corchete
    const anyRegion = rest.match(/\[([^\]]+)\]/);
    if (anyRegion) {
      region = anyRegion[1];
      rest = rest.replace(/\[[^\]]+\]/, '');
    }
  }

  // Extraer todos los paréntesis (potencial nombre inglés y géneros)
  const parens = [];
  let temp = rest;
  let match;
  while ((match = temp.match(/\(([^)]*)\)/)) !== null) {
    parens.push(match[1]);
    temp = temp.replace(/\([^)]*\)/, '');
  }

  // El primer paréntesis suele ser el nombre en inglés (si existe)
  let englishName = '';
  let genres = [];
  if (parens.length > 0) {
    englishName = parens.shift().trim();
    // Los restantes son géneros
    genres = parens.map(g => g.trim()).filter(g => g);
  }

  // Limpiar temp de paréntesis y corchetes para obtener nombre español
  let spanishName = temp.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
  // Si el nombre español está vacío, intentar obtenerlo de la parte antes del primer paréntesis
  if (!spanishName) {
    const beforeParen = rest.match(/^([^(]*)/);
    if (beforeParen) spanishName = beforeParen[1].trim();
  }

  // Limpiar extensiones de archivo
  spanishName = spanishName.replace(/\.(mp4|ts|mkv|avi|mov)$/, '').trim();

  // Todos los paréntesis restantes son géneros; se conservan todos, no solo el primero.
  const normalizedGenres = normalizeGenres(genres);

  // Normalizar región
  const normalizedRegion = normalizeRegion(region);

  // Deducir idioma (mejorable)
  let language = 'Español';
  if (['EU', 'USA', 'Reino Unido', 'Irlanda', 'Australia', 'Nueva Zelanda', 'Canadá', 'Sudáfrica'].includes(normalizedRegion)) {
    language = 'Inglés';
  } else if (normalizedRegion === 'Suecia') {
    language = 'Sueco';
  } else if (normalizedRegion === 'Francia') {
    language = 'Francés';
  } else if (normalizedRegion === 'Alemania') {
    language = 'Alemán';
  } else if (normalizedRegion === 'Tailandia') {
    language = 'Tailandés';
  } else if (normalizedRegion === 'Estonia') {
    language = 'Estonio';
  } else if (normalizedRegion === 'Rusia') {
    language = 'Ruso';
  } else if (normalizedRegion === 'México' || normalizedRegion === 'Argentina' || normalizedRegion === 'Uruguay' || normalizedRegion === 'España') {
    language = 'Español';
  } else {
    language = 'Español';
  }

  // Extraer información de temporadas (solo para series)
  let seasonInfo = null;
  if (type === 'series') {
    const seasonMatch = rest.match(/(\d+)\s*Temp\.?\s*(\d+)\s*Cap\.?/i);
    if (seasonMatch) {
      seasonInfo = { seasons: parseInt(seasonMatch[1], 10), episodes: parseInt(seasonMatch[2], 10) };
    }
  }

  const normalizeName = (name) => {
    if(!name) return '';
    return name.split("_")[0]
  }

  // Construir el objeto
  const item = {
    id: randomUUID(),
    type,
    name: normalizeName(spanishName) || '',
    enName: englishName || '',
    year: year !== null ? year : null,
    rating: 0,
    sizeGb: 0,
    isPremiere: false,
    genres: normalizedGenres,
    region: normalizedRegion,
    language: language,
    description: '',
    imageUrl: '',
    cast: [],
    trailers: [],
    seasons: [],
    seasonCount: seasonInfo?.seasons || 1,
    episodeCount: seasonInfo?.episodes || 1,
    code: code,
  };

  // Añadir a conjuntos (se hará fuera)
  return item;
}

function syncCatalogFromExcel() {
  // 1. Cargar el catálogo existente (para evitar duplicados)
  let existingItems = [];
  try {
    const existingRaw = readFileSync(OUTPUT, 'utf8');
    const existing = JSON.parse(existingRaw);
    if (existing && Array.isArray(existing.items)) {
      existingItems = existing.items;
    }
  } catch (_) {
    // No existe o no es válido, se empezará vacío
  }

  // Poblar el mapa y conjuntos con los ítems existentes
  for (const item of existingItems) {
    if (item.code) {
      itemsMap.set(item.code, item);
      for (const g of itemGenres(item)) genresSet.add(g);
      if (item.region) regionsSet.add(item.region);
      if (item.language) languagesSet.add(item.language);
    }
  }

  // 2. Intentar leer archivos de dataset
  let files = [];
  try {
    files = readdirSync(DATASET_DIR).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  } catch {
    console.warn('[dahem] No se encontró la carpeta dataset/. No se modifica el catálogo.');
    return;
  }

  if (files.length === 0) {
    console.warn('[dahem] No hay archivos .xlsx en dataset/. No se modifica el catálogo.');
    return;
  }

  let totalItems = 0;
  let nuevos = 0;

  for (const file of files) {
    const filePath = join(DATASET_DIR, file);
    console.log(`[dahem] Procesando: ${file}`);
    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (err) {
      console.error(`[dahem] Error al leer ${file}:`, err.message);
      continue;
    }

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const cell = row[colIdx];
          if (!cell || String(cell).trim() === '') continue;

          const text = String(cell).trim();
          const item = parseItem(text);
          if (item) {
            const code = item.code;
            // Si el código ya existe (del catálogo previo o de esta ejecución), se omite
            if (!itemsMap.has(code)) {
              itemsMap.set(code, item);
              totalItems++;
              nuevos++;
              // Añadir a conjuntos (para listas globales)
              for (const g of item.genres) genresSet.add(g);
              regionsSet.add(item.region);
              languagesSet.add(item.language);
            }
          }
        }
      }
    }
  }

  if (totalItems === 0 && itemsMap.size === 0) {
    console.warn('[dahem] No se extrajo ningún ítem de los Excel. No se modifica el catálogo.');
    return;
  }

  const filterOnlyText = (value) => isNaN(value);

  const catalog = {
    version: 1,
    genres: Array.from(genresSet).filter(filterOnlyText).sort(),
    regions: Array.from(regionsSet).filter(filterOnlyText).sort(),
    languages: Array.from(languagesSet).filter(filterOnlyText).sort(),
    items: Array.from(itemsMap.values()),
  };

  writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2));
  console.log(`[dahem] Catálogo sincronizado: ${itemsMap.size} ítems totales (${nuevos} nuevos) → ${OUTPUT}`);
}

// Las funciones puras se exportan para tests/unit/genres.test.ts.
export { parseItem, normalizeGenres, normalizeGenre, itemGenres };

// Solo se ejecuta como CLI (`node scripts/sync-catalog.mjs`), no al importarse.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncCatalogFromExcel();
}