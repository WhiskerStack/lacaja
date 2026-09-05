#!/usr/bin/env node
// scripts/migrate-metadata.mjs
// Migra el catálogo al formato de metadatos agrupados: las banderas de proceso que
// vivían sueltas en la raíz del ítem (enriched, translated, genresEnriched,
// titlesChecked) pasan a `item.metadata`.
// Idempotente: correrlo dos veces no cambia nada.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METADATA_FLAGS, hasFlag, normalizeCatalogMetadata } from './lib/metadata.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog.items ?? [];
  const migrated = normalizeCatalogMetadata(catalog);

  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

  console.log(`[dahem] Metadatos migrados: ${migrated}/${items.length} ítems tocados.`);
  for (const flag of METADATA_FLAGS) {
    const n = items.filter((item) => hasFlag(item, flag)).length;
    console.log(`   metadata.${flag}: ${n}/${items.length}`);
  }
  console.log(`[dahem] → ${CATALOG_PATH}`);
}

main();
