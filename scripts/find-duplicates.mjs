#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import levenshtein from 'fast-levenshtein';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');

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

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog?.items?.filter(c=>c.isActive !== false) || [];
  const threshold = 0.85; // Ajusta según necesidad
  const duplicates = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      // Solo compara si son del mismo tipo y año (reduce falsos positivos)
      if (a.type !== b.type) continue;
      if (a.year !== b.year) continue;

      const sim = similarity(a.name, b.name);
      if (sim >= threshold) {
        duplicates.push({
          i,
          j,
          codeA: a.code || a.id,
          codeB: b.code || b.id,
          nameA: a.name,
          nameB: b.name,
          year: a.year,
          type: a.type,
          similarity: sim,
        });
      }
    }
  }

  console.log(`🔍 Duplicados encontrados (umbral ${threshold}): ${duplicates.length}`);
  if (duplicates.length === 0) {
    console.log('✅ No se detectaron duplicados significativos.');
  } else {
    duplicates.forEach((d) => {
      console.log(
        `- ${d.codeA} (“${d.nameA}”) y ${d.codeB} (“${d.nameB}”) — ` +
        `año: ${d.year}, tipo: ${d.type}, similitud: ${d.similarity.toFixed(3)}`
      );
    });
  }
}

main();