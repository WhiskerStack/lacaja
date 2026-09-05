#!/usr/bin/env node
// scripts/check-enrichment.mjs
// Lee el catálogo y reporta el estado de los procesos, que viven en item.metadata:
// 1. Items sin metadata.enriched
// 2. Items con enriched pero que carecen de imagen (posible fallo de enriquecimiento)
// 3. Conteo de cada bandera del pipeline (enriched, translated, genresEnriched, titlesChecked)

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METADATA_FLAGS, hasFlag, normalizeItemMetadata } from './lib/metadata.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');

function main() {
  let catalog;
  try {
    catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  } catch (err) {
    console.error('❌ No se pudo leer el catálogo:', err.message);
    process.exit(1);
  }

  const items = catalog.items || [];
  if (items.length === 0) {
    console.log('⚠️ El catálogo está vacío.');
    return;
  }

  const sinEnriched = [];
  const incompletos = [];
  const flagCount = Object.fromEntries(METADATA_FLAGS.map((f) => [f, 0]));
  let sinMetadata = 0;

  for (const item of items) {
    const code = item.code || 'sin-código';
    const name = item.name || 'sin-nombre';

    // Este informe no escribe: normaliza en memoria para leer también el formato antiguo.
    if (!item.metadata) sinMetadata++;
    normalizeItemMetadata(item);

    for (const flag of METADATA_FLAGS) {
      if (hasFlag(item, flag)) flagCount[flag]++;
    }

    // 1. ¿Falta metadata.enriched?
    if (!hasFlag(item, 'enriched')) {
      sinEnriched.push({ code, name });
      continue;
    }

    // 2. enriched, pero falta imagen
    const hasImage = item.imageUrl && item.imageUrl.trim() !== '';

    if (!hasImage) {
      incompletos.push({
        code,
        name,
        imageUrl: item.imageUrl || '',
      });
    }
  }

  // ---- Reporte ----
  console.log('\n📊 INFORME DE ENRIQUECIMIENTO DEL CATÁLOGO');
  console.log('===========================================\n');

  if (sinMetadata > 0) {
    console.log(
      `⚠️  ${sinMetadata} ítems sin objeto metadata (formato antiguo). Corre: pnpm migrate-metadata\n`
    );
  }

  // Sin enriched
  console.log(`🔴 Items SIN metadata.enriched: ${sinEnriched.length}`);
  if (sinEnriched.length > 0) {
    sinEnriched.forEach(({ code, name }) => {
      console.log(`   - ${code}  ${name}`);
    });
  } else {
    console.log('   ✅ Todos los items tienen enriched activo.');
  }

  // Incompletos (solo falta de imagen)
  console.log(`\n🟡 Items con enriched pero SIN IMAGEN: ${incompletos.length}`);
  if (incompletos.length > 0) {
    incompletos.forEach(({ code, name, imageUrl }) => {
      console.log(`   - ${code}  ${name}`);
      console.log(`       imageUrl: ${imageUrl || '(vacío)'}`);
    });
  } else {
    console.log('   ✅ Todos los items enriquecidos tienen imagen.');
  }

  // Resumen final
  const total = items.length;
  const ok = total - sinEnriched.length - incompletos.length;
  console.log(`\n📦 Total items: ${total}`);
  console.log(`   ✅ Completos (enriched y con imagen): ${ok}`);
  console.log(`   ⚠️  Sin enriched: ${sinEnriched.length}`);
  console.log(`   ⚠️  Incompletos (enriched, sin imagen): ${incompletos.length}`);

  console.log('\n🏷️  Banderas de metadata:');
  for (const flag of METADATA_FLAGS) {
    console.log(
      `   ${flag}: ${flagCount[flag]}/${total} · pendientes: ${total - flagCount[flag]}`
    );
  }
}

main();
