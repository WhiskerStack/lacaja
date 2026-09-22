// scripts/fix-title-languages.mjs
// Traduce títulos del catálogo con Ollama:
// - Si falta name, traduce enName al español y lo pone en name.
// - Si falta enName, traduce name al inglés y lo pone en enName.
// - Si ambos existen, traduce name al inglés (para enName) y enName al español (para name),
//   asegurando que name quede en español y enName en inglés.
//
// Uso:
//   node scripts/fix-title-languages.mjs --dry-run     (no escribe: solo informa qué haría)
//   node scripts/fix-title-languages.mjs --limit=20    (primeros 20 ítems, para revisar)
//
// Variables: OLLAMA_URL, OLLAMA_MODEL, OLLAMA_DELAY_MS.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setFlag, normalizeItemMetadata, normalizeCatalogMetadata } from './lib/metadata.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const DELAY_MS = Number(process.env.OLLAMA_DELAY_MS ?? 200);
const SAVE_EVERY = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Ollama ---

/** Llama a Ollama y devuelve el texto de la respuesta. */
async function ollama(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature: 0 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama respondió con ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.response ?? '').trim();
}

/** Limpia y valida la respuesta del modelo. */
export function sanitizeTitle(raw, original) {
  if (!raw) return null;
  let out = String(raw).split('\n')[0].trim();
  out = out.replace(/^["'«»¿¡\s]+|["'«»\s.]+$/g, '').trim();
  out = out.replace(/^(el\s+)?t[íi]tulo[^:]*:\s*/i, '').replace(/^translation:\s*/i, '').trim();
  if (!out) return null;
  if (out.length > Math.max(60, original.length * 3)) return null;
  if (out.split(/\s+/).length > Math.max(12, original.split(/\s+/).length * 3)) return null;
  return out;
}

/** Traduce un título suelto al idioma destino. Devuelve null si falla. */
export async function translateTitle(text, to) {
  const target = to === 'es' ? 'español' : 'inglés';
  const prompt = `Traduce al ${target} este título de película o serie. Si existe un título oficial en ${target}, usa ese. Responde solo con el título, sin comillas, sin explicaciones y sin punto final.

${text}`;
  return sanitizeTitle(await ollama(prompt), text);
}

// ----------------------------------------------------------------- Ítems ---

/**
 * Revisa un ítem y aplica las traducciones necesarias para que
 * name quede en español y enName en inglés.
 */
export async function fixItem(item, { dryRun = false } = {}) {
  // Tolera ítems en formato antiguo (banderas sueltas en la raíz del ítem).
  if (!dryRun) normalizeItemMetadata(item);

  const name = item.name ?? '';
  const enName = item.enName ?? '';

  let changed = false;
  let details = [];

  // Caso 1: falta name → traducir enName a español
  if (!name.trim() && enName.trim()) {
    const translated = await translateTitle(enName, 'es');
    if (translated) {
      if (!dryRun) {
        item.name = translated;
        setFlag(item, 'titlesChecked');
      }
      changed = true;
      details.push(`name = "${translated}" (desde enName)`);
    } else {
      return { action: 'skip', reason: 'traducción fallida para name', changed: false };
    }
  }
  // Caso 2: falta enName → traducir name a inglés
  else if (name.trim() && !enName.trim()) {
    const translated = await translateTitle(name, 'en');
    if (translated) {
      if (!dryRun) {
        item.enName = translated;
        setFlag(item, 'titlesChecked');
      }
      changed = true;
      details.push(`enName = "${translated}" (desde name)`);
    } else {
      return { action: 'skip', reason: 'traducción fallida para enName', changed: false };
    }
  }
  // Caso 3: ambos existen → traducir ambos (name→en, enName→es)
  else if (name.trim() && enName.trim()) {
    // Traducir name al inglés para enName
    const translatedEn = await translateTitle(name, 'en');
    // Traducir enName al español para name
    const translatedEs = await translateTitle(enName, 'es');

    let anyOk = false;
    if (translatedEn) {
      if (!dryRun) item.enName = translatedEn;
      changed = true;
      anyOk = true;
      details.push(`enName = "${translatedEn}" (desde name)`);
    }
    if (translatedEs) {
      if (!dryRun) item.name = translatedEs;
      changed = true;
      anyOk = true;
      details.push(`name = "${translatedEs}" (desde enName)`);
    }
    if (!anyOk) {
      return { action: 'skip', reason: 'ambas traducciones fallaron', changed: false };
    }
    if (!dryRun) setFlag(item, 'titlesChecked');
  }
  // Caso 4: ambos vacíos (no debería ocurrir)
  else {
    return { action: 'skip', reason: 'ambos campos vacíos', changed: false };
  }

  return {
    action: changed ? 'translate' : 'skip',
    changed,
    detail: details.join('; '),
  };
}

// ------------------------------------------------------------------ Main ---

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog.items || [];

  // Absorbe las banderas sueltas del formato antiguo antes de empezar.
  if (!dryRun) normalizeCatalogMetadata(catalog);

  const pending = items.slice(0, limit);

  console.log(`📚 Total: ${items.length} ítems · por revisar: ${pending.length}${dryRun ? ' (--dry-run: no se escribe nada)' : ''}`);
  console.log(`🤖 Modelo: ${MODEL} en ${OLLAMA_URL}\n`);

  const tally = { translate: 0, skip: 0, error: 0 };
  let changedSinceSave = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    const code = item.code || item.id;
    try {
      const result = await fixItem(item, { dryRun });
      tally[result.action] = (tally[result.action] ?? 0) + 1;

      const icon = result.action === 'translate' ? '🌐' : '➖';
      const detail = result.detail || result.reason || '';
      console.log(`${icon} [${i + 1}/${pending.length}] ${code} ${result.action}${detail ? ` · ${detail}` : ''}`);

      if (result.changed) changedSinceSave++;
      if (!dryRun && changedSinceSave >= SAVE_EVERY) {
        writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
        console.log(`💾 Progreso guardado (${i + 1}/${pending.length})`);
        changedSinceSave = 0;
      }
    } catch (err) {
      tally.error++;
      console.error(`❌ [${i + 1}/${pending.length}] ${code}: ${err.message}`);
    }
    if (DELAY_MS > 0) await sleep(DELAY_MS);
  }

  if (!dryRun) writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(
    `\n📊 Traducidos: ${tally.translate} · saltados: ${tally.skip} · errores: ${tally.error}`
  );
  if (dryRun) console.log('ℹ️  --dry-run: el catálogo no se ha modificado.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}