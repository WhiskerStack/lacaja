#!/usr/bin/env node
// scripts/fix-title-languages.mjs
// Ordena los títulos del catálogo por idioma con Ollama (local, como translate-descriptions):
// `name` debe llevar el título en español y `enName` el título en inglés.
//
// Si falta uno de los dos campos, se traduce a partir del otro.
// Si ambos existen, se detectan los idiomas y se intercambian o traducen según corresponda.
//
// Uso:
//   node scripts/fix-title-languages.mjs --dry-run     (no escribe: solo informa qué haría)
//   node scripts/fix-title-languages.mjs --limit=20    (primeros 20 ítems, para revisar)
//   node scripts/fix-title-languages.mjs --skip-identical  (no toca los pares idénticos)
//
// Variables: OLLAMA_URL, OLLAMA_MODEL, OLLAMA_DELAY_MS.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const DELAY_MS = Number(process.env.OLLAMA_DELAY_MS ?? 200);
const SAVE_EVERY = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Ollama ---

/** Llama a Ollama y devuelve el texto de la respuesta. `json: true` fuerza salida JSON. */
async function ollama(prompt, { json = false } = {}) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      ...(json ? { format: 'json' } : {}),
      options: { temperature: 0 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama respondió con ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.response ?? '').trim();
}

const LANGS = ['es', 'en', 'other', 'unknown'];

// Palabras comunes para heurística de respaldo
const SPANISH_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'y', 'que', 'en', 'por', 'para',
  'con', 'sin', 'sobre', 'entre', 'a', 'al', 'lo', 'su', 'mi', 'tu', 'se', 'me', 'te',
  'nos', 'os', 'les', 'sí', 'no', 'ya', 'ahora', 'cuando', 'donde', 'cómo', 'qué'
]);
const ENGLISH_WORDS = new Set([
  'the', 'of', 'and', 'to', 'for', 'on', 'at', 'from', 'with', 'without', 'about',
  'between', 'by', 'in', 'into', 'through', 'during', 'after', 'before', 'above',
  'below', 'up', 'down', 'a', 'an', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must'
]);

function guessLanguage(text) {
  const words = text.toLowerCase().split(/\s+/);
  let es = 0, en = 0;
  for (const w of words) {
    if (SPANISH_WORDS.has(w)) es++;
    if (ENGLISH_WORDS.has(w)) en++;
  }
  if (es > en) return 'es';
  if (en > es) return 'en';
  return 'unknown';
}

/**
 * Detecta el idioma de los dos títulos. Si Ollama devuelve unknown, usa heurística.
 */
export async function detectLanguages(name, enName) {
  const prompt = `Eres un catalogador de cine. Analiza estos dos títulos de una misma película o serie.

Título A: ${name}
Título B: ${enName}

Responde SOLO con un objeto JSON con esta forma exacta:
{"a":"es|en|other|unknown","b":"es|en|other|unknown","translatable":true|false}

- "a" y "b": el idioma de cada título. Usa "other" si es otro idioma y "unknown" si no puedes
  determinarlo (por ejemplo, un nombre propio, una cifra o una palabra inventada).
- "translatable": true solo si es un título que realmente cambia al pasar de español a inglés.
  Para nombres propios, marcas o palabras que se dejan igual en ambos idiomas, pon false.`;

  let raw;
  try {
    raw = await ollama(prompt, { json: true });
  } catch {
    raw = '{"a":"unknown","b":"unknown","translatable":false}';
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { a: 'unknown', b: 'unknown', translatable: false };
  }

  const norm = (v) => (LANGS.includes(v) ? v : 'unknown');
  let result = {
    name: norm(parsed.a),
    enName: norm(parsed.b),
    translatable: parsed.translatable === true,
  };

  // Si ambos son unknown, usar heurística
  if (result.name === 'unknown' && result.enName === 'unknown') {
    const guessA = guessLanguage(name);
    const guessB = guessLanguage(enName);
    result.name = guessA;
    result.enName = guessB;
    if (result.name !== 'unknown' && result.enName !== 'unknown') {
      result.translatable = name.toLowerCase() !== enName.toLowerCase();
    }
  }
  return result;
}

/** Traduce un título suelto. Devuelve null si la respuesta no parece un título. */
export async function translateTitle(text, to) {
  const target = to === 'es' ? 'español' : 'inglés';
  const prompt = `Traduce al ${target} este título de película o serie. Si existe un título oficial en ${target}, usa ese. Responde solo con el título, sin comillas, sin explicaciones y sin punto final.

${text}`;
  return sanitizeTitle(await ollama(prompt), text);
}

/**
 * Limpia y valida la respuesta del modelo.
 */
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

// ------------------------------------------------------------- Decisiones ---

export function hasLetters(text) {
  return /\p{L}/u.test(text ?? '');
}

/**
 * Decide qué hacer con un ítem.
 * Si falta un campo, devuelve translate para rellenarlo.
 * Si ambos existen, aplica la lógica normal con detección de idiomas.
 */
export function decideAction({ name, enName, langs, skipIdentical = false }) {
  const nameTrim = name?.trim() || '';
  const enNameTrim = enName?.trim() || '';

  // Caso: falta name, traducir enName a español
  if (!nameTrim && enNameTrim) {
    if (!hasLetters(enNameTrim)) return { action: 'skip', reason: 'enName sin letras' };
    return { action: 'translate', field: 'name', to: 'es', from: enNameTrim };
  }
  // Caso: falta enName, traducir name a inglés
  if (nameTrim && !enNameTrim) {
    if (!hasLetters(nameTrim)) return { action: 'skip', reason: 'name sin letras' };
    return { action: 'translate', field: 'enName', to: 'en', from: nameTrim };
  }
  // Caso: ambos vacíos
  if (!nameTrim && !enNameTrim) return { action: 'skip', reason: 'ambos campos vacíos' };

  // Ambos existen: aplicar lógica normal
  if (skipIdentical && nameTrim.toLowerCase() === enNameTrim.toLowerCase()) {
    return { action: 'skip', reason: 'títulos idénticos (--skip-identical)' };
  }

  if (!langs) return { action: 'needs-detection' };

  const { name: a, enName: b, translatable } = langs;
  if (a === 'es' && b === 'en') return { action: 'ok' };
  if (a === 'en' && b === 'es') return { action: 'swap' };

  if (a === 'es' && b === 'es') {
    return translatable
      ? { action: 'translate', field: 'enName', to: 'en', from: name }
      : { action: 'skip', reason: 'ambos en español, título no traducible' };
  }
  if (a === 'en' && b === 'en') {
    return translatable
      ? { action: 'translate', field: 'name', to: 'es', from: enName }
      : { action: 'skip', reason: 'ambos en inglés, título no traducible' };
  }

  return { action: 'skip', reason: `idiomas no concluyentes (${a}/${b})` };
}

// ----------------------------------------------------------------- Ítems ---

/**
 * Revisa un ítem y aplica la corrección. Con dryRun no modifica nada.
 */
export async function fixItem(item, { dryRun = false, skipIdentical = false } = {}) {
  const name = item.name ?? '';
  const enName = item.enName ?? '';

  // Primero, ver si falta algún campo y traducir directamente
  const decision = decideAction({ name, enName, langs: null, skipIdentical });
  if (decision.action === 'translate') {
    const translated = await translateTitle(decision.from, decision.to);
    if (!translated) {
      return { action: 'skip', reason: 'traducción descartada', changed: false };
    }
    if (translated.trim().toLowerCase() === decision.from.trim().toLowerCase()) {
      return { action: 'skip', reason: 'la traducción coincide con el original', changed: false };
    }
    if (!dryRun) {
      item[decision.field] = translated;
    }
    return {
      action: 'translate',
      changed: true,
      detail: `${decision.field} = "${translated}" (desde "${decision.from}")`,
    };
  }
  if (decision.action === 'skip') {
    return { ...decision, changed: false };
  }

  // Ambos existen: detectar idiomas
  const langs = await detectLanguages(name, enName);
  const finalDecision = decideAction({ name, enName, langs, skipIdentical });

  if (finalDecision.action === 'ok' || finalDecision.action === 'skip') {
    return { ...finalDecision, changed: false, detail: `${langs.name}/${langs.enName}` };
  }

  if (finalDecision.action === 'swap') {
    if (!dryRun) {
      item.name = enName;
      item.enName = name;
    }
    return { action: 'swap', changed: true, detail: `"${name}" ⇄ "${enName}"` };
  }

  if (finalDecision.action === 'translate') {
    const translated = await translateTitle(finalDecision.from, finalDecision.to);
    if (!translated) {
      return { action: 'skip', reason: 'traducción descartada', changed: false };
    }
    if (translated.trim().toLowerCase() === finalDecision.from.trim().toLowerCase()) {
      return { action: 'skip', reason: 'la traducción coincide con el original', changed: false };
    }
    if (!dryRun) {
      item[finalDecision.field] = translated;
    }
    return {
      action: 'translate',
      changed: true,
      detail: `${finalDecision.field} = "${translated}" (desde "${finalDecision.from}")`,
    };
  }

  return { action: 'skip', reason: 'sin acción', changed: false };
}

// ------------------------------------------------------------------ Main ---

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skipIdentical = process.argv.includes('--skip-identical');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog.items || [];
  // Siempre procesamos todos los ítems (sin flag de ya revisado)
  const pending = items.slice(0, limit);

  console.log(`📚 Total: ${items.length} ítems · por revisar: ${pending.length}${dryRun ? ' (--dry-run: no se escribe nada)' : ''}`);
  console.log(`🤖 Modelo: ${MODEL} en ${OLLAMA_URL}\n`);

  const tally = { ok: 0, swap: 0, translate: 0, skip: 0, error: 0 };
  let changedSinceSave = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    const code = item.code || item.id;
    try {
      const result = await fixItem(item, { dryRun, skipIdentical });
      tally[result.action] = (tally[result.action] ?? 0) + 1;

      const icon = { ok: '✅', swap: '🔁', translate: '🌐', skip: '➖' }[result.action] ?? '·';
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
    `\n📊 Correctos: ${tally.ok} · intercambiados: ${tally.swap} · traducidos: ${tally.translate} · sin tocar: ${tally.skip} · errores: ${tally.error}`
  );
  if (dryRun) console.log('ℹ️  --dry-run: el catálogo no se ha modificado.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}