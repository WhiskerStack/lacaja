#!/usr/bin/env node
// scripts/disable-duplicates.mjs
// Encuentra duplicados en el catálogo (mismo tipo, año y nombre similar).
// Para cada par, desactiva (isActive: false) el ítem más viejo según año y código.
// Los ítems ya inactivos no se consideran en la búsqueda.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import levenshtein from 'fast-levenshtein';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');

const SIMILARITY_THRESHOLD = 0.85; // Ajustable

/**
 * Normaliza un texto: minúsculas, elimina acentos y caracteres no alfanuméricos
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '');
}

/**
 * Similitud entre dos cadenas (0..1) basada en distancia de Levenshtein
 */
function similarity(a, b) {
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA.length === 0 && normB.length === 0) return 1;
  const dist = levenshtein.get(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - dist / maxLen;
}

/**
 * Extrae el número de un código (P123 → 123, S45 → 45)
 */
function codeNumber(code) {
  const match = code.match(/^[PS](\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Determina cuál de dos ítems es más viejo.
 * Prioriza el año menor; si son iguales, el código numérico menor.
 * Devuelve el índice del más viejo (0 o 1) dentro del par [a, b].
 */
function getOlderIndex(a, b) {
  if (a.year !== b.year) {
    return a.year < b.year ? 0 : 1;
  }
  // Mismo año: comparar código numérico
  const numA = codeNumber(a.code || a.id);
  const numB = codeNumber(b.code || b.id);
  return numA < numB ? 0 : 1;
}

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog?.items || [];
  if (items.length === 0) {
    console.log('⚠️ El catálogo está vacío.');
    return;
  }

  // Solo considerar ítems activos (isActive no es false)
  const activeItems = items.filter(item => item.isActive !== false);
  console.log(`📦 Total de ítems: ${items.length}, activos: ${activeItems.length}`);

  const pairs = [];
  const toDisable = new Set(); // guardamos códigos de los que desactivaremos

  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const a = activeItems[i];
      const b = activeItems[j];

      // Solo comparar si mismo tipo y mismo año
      if (a.type !== b.type) continue;
      if (a.year !== b.year) continue;

      const sim = similarity(a.name, b.name);
      if (sim >= SIMILARITY_THRESHOLD) {
        pairs.push({ i, j, a, b, sim });
        // Determinar cuál es más viejo
        const olderIdx = getOlderIndex(a, b);
        const older = olderIdx === 0 ? a : b;
        toDisable.add(older.code || older.id);
        console.log(
          `🔍 Par: ${a.code || a.id} (“${a.name}”) vs ${b.code || b.id} (“${b.name}”) — ` +
          `similitud: ${sim.toFixed(3)} — Se desactivará ${older.code || older.id} (más viejo)`
        );
      }
    }
  }

  if (toDisable.size === 0) {
    console.log('✅ No se encontraron duplicados para desactivar.');
    return;
  }

  // Desactivar los ítems marcados
  let disabledCount = 0;
  for (const item of items) {
    const code = item.code || item.id;
    if (toDisable.has(code) && item.isActive !== false) {
      item.isActive = false;
      disabledCount++;
    }
  }

  // Guardar el catálogo
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(`\n✅ Desactivados ${disabledCount} ítems duplicados (los más viejos).`);
  console.log(`💾 Catálogo actualizado: ${CATALOG_PATH}`);
}

main();