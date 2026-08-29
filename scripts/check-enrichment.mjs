#!/usr/bin/env node
// scripts/check-enrichment.mjs
// Lee el catálogo y reporta:
// 1. Items sin enriched (o con false)
// 2. Items con enriched true pero que carecen de imagen (posible fallo de enriquecimiento)

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  for (const item of items) {
    const code = item.code || 'sin-código';
    const name = item.name || 'sin-nombre';

    // 1. ¿Falta enriched o es false?
    if (!item.enriched || item.enriched === false) {
      sinEnriched.push({ code, name, enriched: item.enriched });
      continue;
    }

    // 2. enriched true, pero falta imagen
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

  // Sin enriched
  console.log(`🔴 Items SIN enriched (o con false): ${sinEnriched.length}`);
  if (sinEnriched.length > 0) {
    sinEnriched.forEach(({ code, name, enriched }) => {
      console.log(`   - ${code}  ${name}  (enriched: ${enriched})`);
    });
  } else {
    console.log('   ✅ Todos los items tienen enriched activo.');
  }

  // Incompletos (solo falta de imagen)
  console.log(`\n🟡 Items con enriched true pero SIN IMAGEN: ${incompletos.length}`);
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
  console.log(`   ✅ Completos (enriched true y con imagen): ${ok}`);
  console.log(`   ⚠️  Sin enriched: ${sinEnriched.length}`);
  console.log(`   ⚠️  Incompletos (enriched true, sin imagen): ${incompletos.length}`);
}

main();