#!/usr/bin/env node
// scripts/disable-duplicates.mjs
// Encuentra duplicados en el catálogo (mismo tipo, año y nombre similar).
// Para cada par, desactiva (isActive: false) el ítem con el número de código más grande
// (el que tiene la letra P/S seguida de un número mayor).

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
 * Extrae el número de un código base (P123 → 123, S45 → 45).
 * Solo funciona con códigos sin guiones (nivel audiovisual).
 */
function codeNumber(code) {
  const match = code.match(/^[PS](\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Determina cuál de dos ítems tiene el número de código mayor.
 * Devuelve el índice del de mayor número (0 o 1) dentro del par [a, b].
 */
function getNewerIndex(a, b) {
  const numA = codeNumber(a.code || a.id);
  const numB = codeNumber(b.code || b.id);
  return numA > numB ? 0 : 1; // mayor número → se desactiva
}

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog?.items || [];
  if (items.length === 0) {
    console.log('⚠️ El catálogo está vacío.');
    return;
  }

  // Solo considerar ítems activos (isActive !== false) y que sean de nivel audiovisual
  // (código sin guiones, p.ej. P123 o S456)
  const activeItems = items.filter(item => {
    if (item.isActive === false) return false;
    const code = item.code || item.id;
    return /^[PS]\d+$/.test(code); // solo códigos base
  });

  console.log(`📦 Total de ítems: ${items.length}, audiovisuales activos: ${activeItems.length}`);

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
        // Determinar cuál tiene mayor número (el más nuevo)
        const newerIdx = getNewerIndex(a, b);
        const newer = newerIdx === 0 ? a : b;
        toDisable.add(newer.code || newer.id);
        console.log(
          `🔍 Par: ${a.code || a.id} (“${a.name}”) vs ${b.code || b.id} (“${b.name}”) — ` +
          `similitud: ${sim.toFixed(3)} — Se desactivará ${newer.code || newer.id} (número mayor)`
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
  console.log(`\n✅ Desactivados ${disabledCount} ítems duplicados (los de número de código mayor).`);
  console.log(`💾 Catálogo actualizado: ${CATALOG_PATH}`);
}

main();