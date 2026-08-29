#!/usr/bin/env node
// sync-catalog.mjs
// Lee todos los archivos .xlsx en la carpeta dataset/ y extrae cada ítem
// según el formato: P105_Magical Girl_(Magical Girl)_[2014].mp4_(Drama)_(Thriller)_(Crimen)_[España]
// Genera src/data/catalog.json

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATASET_DIR = resolve(ROOT, 'dataset');
const OUTPUT = resolve(ROOT, 'src/data/catalog.json');

// Conjuntos para listas únicas
const genresSet = new Set();
const regionsSet = new Set();
const languagesSet = new Set();

// Mapa de ítems por código
const itemsMap = new Map();

// --- Función de parsing mejorada ---

function parseItem(text) {
  if (!text || typeof text !== 'string') return null;
  text = text.trim();
  if (!text) return null;

  // Dividir por '_' y eliminar partes vacías
  const parts = text.split('_').filter(p => p.length > 0);
  if (parts.length < 5) {
    // No tiene la estructura mínima esperada
    return null;
  }

  let idx = 0;

  // 1. Código: debe ser P o S seguido de número
  const codePart = parts[idx++];
  const codeMatch = codePart.match(/^([PS])(\d+)$/);
  if (!codeMatch) return null;
  const prefix = codeMatch[1];
  const id = parseInt(codeMatch[2], 10);
  const type = prefix === 'P' ? 'movie' : 'series';
  const code = `${prefix}${id}`;

  // 2. Nombre en español
  const spanishName = parts[idx++];

  // 3. Nombre en inglés (entre paréntesis)
  let engNamePart = parts[idx++];
  // Quitar paréntesis
  let englishName = engNamePart.replace(/^\(|\)$/g, '');

  // 4. Año (entre corchetes) - puede tener .mp4 pegado
  let yearPart = parts[idx++];
  // Si contiene .mp4, lo quitamos
  yearPart = yearPart.replace(/\.mp4$/, '');
  // Extraer año entre corchetes
  const yearMatch = yearPart.match(/\[(\d{4})\]/);
  let year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  // 5. Géneros: mientras la parte empiece con '(' y termine con ')'
  const genres = [];
  while (idx < parts.length && parts[idx].startsWith('(') && parts[idx].endsWith(')')) {
    const genre = parts[idx].replace(/^\(|\)$/g, '');
    if (genre) genres.push(genre);
    idx++;
  }

  // 6. País: debe ser el último elemento y debe empezar con '['
  let region = '';
  if (idx < parts.length) {
    const lastPart = parts[idx];
    // Si el último elemento empieza con '[' y termina con ']'
    if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
      region = lastPart.replace(/^\[|\]$/g, '');
    } else {
      // intentar extraer corchetes de la parte restante
      const regionMatch = lastPart.match(/\[([^\]]+)\]$/);
      if (regionMatch) region = regionMatch[1];
    }
  }

  // Si no se encontró región, usamos 'Desconocido'
  if (!region) region = 'Desconocido';

  // 7. Deducir idioma a partir de la región
  let language = 'Español';
  if (region && (region === 'EU' || region === 'EE.UU.' || region === 'Reino Unido' || region === 'Inglaterra')) {
    language = 'Inglés';
  } else if (region && region === 'Japón') {
    language = 'Japonés';
  } else if (region && region === 'Corea del Sur') {
    language = 'Coreano';
  } else if (region && region === 'España') {
    language = 'Español';
  }

  // 8. Determinar género principal (el primero)
  const mainGenre = genres.length > 0 ? genres[0] : 'Sin género';

  // 9. Construir el item
  const item = {
    id,
    type,
    name: spanishName || '',
    enName: englishName || '',
    year: year || 0,
    rating: 0,
    sizeGb: 0,
    isPremiere: false,
    genre: mainGenre,
    region: region,
    language: language,
    description: '',
    imageUrl: '',
    cast: [],
    trailers: [],
    seasons: [],
    code: code,
  };

  // Si es serie, podemos crear temporadas genéricas (más adelante se pueden enriquecer)
  // No tenemos información de capítulos, así que dejamos seasons vacío por ahora.
  // (Pero si en el futuro añadimos más datos, se puede modificar)

  return item;
}

// --- Función principal ---

function syncCatalogFromExcel() {
  // Comprobar que existe la carpeta dataset
  let files = [];
  try {
    files = readdirSync(DATASET_DIR).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  } catch {
    console.warn('[dahem] No se encontró la carpeta dataset/. Se usará el catálogo sample.');
    // Copiar sample si existe
    try {
      const sample = readFileSync(resolve(ROOT, 'src/data/catalog.sample.json'), 'utf8');
      writeFileSync(OUTPUT, sample);
      console.log('[dahem] catalog.json restaurado desde sample.');
    } catch {
      console.error('[dahem] No se pudo restaurar catalog.sample.json.');
    }
    return;
  }

  if (files.length === 0) {
    console.warn('[dahem] No hay archivos .xlsx en dataset/. Se usará sample.');
    try {
      const sample = readFileSync(resolve(ROOT, 'src/data/catalog.sample.json'), 'utf8');
      writeFileSync(OUTPUT, sample);
      console.log('[dahem] catalog.json restaurado desde sample.');
    } catch {
      console.error('[dahem] No se pudo restaurar catalog.sample.json.');
    }
    return;
  }

  let totalItems = 0;

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

    // Recorrer todas las hojas
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      // Convertir a array de arrays (todas las celdas)
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // Recorrer cada fila y columna
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const cell = row[colIdx];
          if (!cell || String(cell).trim() === '') continue;

          const text = String(cell).trim();
          const item = parseItem(text);
          if (item) {
            // Evitar duplicados por código
            const code = item.code;
            if (!itemsMap.has(code)) {
              itemsMap.set(code, item);
              totalItems++;
              // Añadir a conjuntos
              if (item.genre) genresSet.add(item.genre);
              if (item.region) regionsSet.add(item.region);
              if (item.language) languagesSet.add(item.language);
            }
          }
        }
      }
    }
  }

  // Si no se extrajo nada, usar sample
  if (totalItems === 0) {
    console.warn('[dahem] No se extrajo ningún ítem de los Excel. Se usará sample.');
    try {
      const sample = readFileSync(resolve(ROOT, 'src/data/catalog.sample.json'), 'utf8');
      writeFileSync(OUTPUT, sample);
    } catch {
      console.error('[dahem] No se pudo restaurar catalog.sample.json.');
    }
    return;
  }

  const filterOnlyText = (value) => isNaN(value);

  // Construir catálogo final
  const catalog = {
    version: 1,
    genres: Array.from(genresSet).filter(filterOnlyText).sort(),
    regions: Array.from(regionsSet).filter(filterOnlyText).sort(),
    languages: Array.from(languagesSet).filter(filterOnlyText).sort(),
    items: Array.from(itemsMap.values()),
  };

  writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2));
  console.log(`[dahem] Catálogo sincronizado: ${totalItems} ítems → ${OUTPUT}`);
}

syncCatalogFromExcel();