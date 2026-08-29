#!/usr/bin/env node
// Sincroniza el catálogo del backend hacia src/data/catalog.json, que es lo que el SSG
// (buildData.ts) y los índices de búsqueda consumen en build-time.
//
// - Fuente: GET {API}/catalog/export  (volcado completo, público).
// - Destino: src/data/catalog.json     (artefacto generado, gitignored).
// - Offline-safe: si el backend no responde, cae a copiar src/data/catalog.sample.json,
//   de modo que el build nunca se rompe (y catalog.json siempre existe).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SAMPLE = resolve(ROOT, 'src/data/catalog.sample.json');
const OUT = resolve(ROOT, 'src/data/catalog.json');

// Base del backend para el build-time. Sin sufijo /api (el backend no usa prefijo global).
const BASE = (
  process.env.CATALOG_API_URL ??
  process.env.PUBLIC_API_URL ??
  'http://localhost:3010'
).replace(/\/$/, '');
const URL = `${BASE}/catalog/export`;
const TIMEOUT_MS = 8000;

function fallbackToSample(reason) {
  // eslint-disable-next-line no-console
  console.warn(`[dahem] sync-catalog: ${reason}. Usando catalog.sample.json como respaldo.`);
  const sample = readFileSync(SAMPLE, 'utf8');
  writeFileSync(OUT, sample);
}

async function syncCatalog() {
  let res;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    res = await fetch(URL, { signal: controller.signal }).finally(() => clearTimeout(timer));
  } catch (err) {
    fallbackToSample(`no se pudo contactar al backend en ${URL} (${err?.message ?? err})`);
    return;
  }

  if (!res.ok) {
    fallbackToSample(`el backend respondió ${res.status} en ${URL}`);
    return;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    fallbackToSample(`la respuesta de ${URL} no es JSON válido`);
    return;
  }

  if (!data || !Array.isArray(data.items)) {
    fallbackToSample(`la respuesta de ${URL} no tiene la forma esperada`);
    return;
  }

  writeFileSync(OUT, JSON.stringify(data));
  // eslint-disable-next-line no-console
  console.log(`[dahem] sync-catalog: catálogo sincronizado desde ${URL} (${data.items.length} items) → src/data/catalog.json`);
}

await syncCatalog();
