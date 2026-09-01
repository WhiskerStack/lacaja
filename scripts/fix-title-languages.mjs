#!/usr/bin/env node
// scripts/fix-title-languages.mjs
// Ordena los títulos del catálogo por idioma con Ollama (local, como translate-descriptions):
// `name` debe llevar el título en español y `enName` el título en inglés.
//
// Por cada ítem se detecta el idioma de los dos campos y se decide:
//   - correcto (es / en)      → no se toca
//   - invertido (en / es)     → se intercambian, sin llamar al traductor
//   - los dos en el mismo     → se traduce al idioma que falta el campo que toca:
//                               ambos en español → se rehace enName en inglés
//                               ambos en inglés  → se rehace name en español
//   - cualquier otro caso     → se deja como está y se informa
//
// Uso:
//   node scripts/fix-title-languages.mjs --dry-run     (no escribe: solo informa qué haría)
//   node scripts/fix-title-languages.mjs --limit=20    (primeros 20 pendientes, para revisar)
//   node scripts/fix-title-languages.mjs --force       (repasa también los ya revisados)
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
/** Marca en el ítem para no repasar dos veces lo mismo. */
const FLAG = 'titlesChecked';

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
      // temperature 0: la misma entrada da la misma decisión en cada pasada.
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

/**
 * Detecta el idioma de los dos títulos en una sola llamada. Devuelve
 * { name: 'es'|'en'|'other'|'unknown', enName: ..., translatable: boolean }.
 * `translatable` distingue un título que cambia entre mercados ("El Padrino") de uno que es igual
 * en los dos ("Dune", "Pluribus"): sin esa distinción, traducir nombres propios inventa títulos.
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

  const raw = await ollama(prompt, { json: true });
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { name: 'unknown', enName: 'unknown', translatable: false };
  }
  const norm = (v) => (LANGS.includes(v) ? v : 'unknown');
  return {
    name: norm(parsed.a),
    enName: norm(parsed.b),
    translatable: parsed.translatable === true,
  };
}

/** Traduce un título suelto. Devuelve null si la respuesta no parece un título. */
export async function translateTitle(text, to) {
  const target = to === 'es' ? 'español' : 'inglés';
  const prompt = `Traduce al ${target} este título de película o serie. Si existe un título oficial en ${target}, usa ese. Responde solo con el título, sin comillas, sin explicaciones y sin punto final.

${text}`;
  return sanitizeTitle(await ollama(prompt), text);
}

/**
 * Limpia y valida la respuesta del modelo. Rechaza lo que no parece un título (frases explicativas,
 * respuestas vacías o desproporcionadas): más vale dejar el dato como estaba que estropearlo.
 */
export function sanitizeTitle(raw, original) {
  if (!raw) return null;
  let out = String(raw).split('\n')[0].trim();
  out = out.replace(/^["'«»¿¡\s]+|["'«»\s.]+$/g, '').trim();
  // Cortes típicos de los modelos pequeños: "El título en inglés es: X".
  out = out.replace(/^(el\s+)?t[íi]tulo[^:]*:\s*/i, '').replace(/^translation:\s*/i, '').trim();
  if (!out) return null;
  if (out.length > Math.max(60, original.length * 3)) return null;
  if (out.split(/\s+/).length > Math.max(12, original.split(/\s+/).length * 3)) return null;
  return out;
}

// ------------------------------------------------------------- Decisiones ---

/** Un título sin letras (cifras, símbolos) no tiene idioma que detectar: "65", "180". */
export function hasLetters(text) {
  return /\p{L}/u.test(text ?? '');
}

/**
 * Motivos para descartar un ítem sin gastar una llamada al modelo.
 * Devuelve el motivo, o null si hay que analizarlo.
 */
export function trivialSkip(name, enName, { skipIdentical = false } = {}) {
  if (!name?.trim()) return 'sin name';
  if (!enName?.trim()) return 'sin enName';
  if (!hasLetters(name) || !hasLetters(enName)) return 'título sin letras';
  // Con --skip-identical los pares iguales ni se consultan: útil si el modelo se está inventando
  // traducciones de nombres propios ("Pluribus", "Anora") en vez de marcarlos como no traducibles.
  if (skipIdentical && name.trim().toLowerCase() === enName.trim().toLowerCase()) {
    return 'títulos idénticos (--skip-identical)';
  }
  return null;
}

/**
 * Decide qué hacer con un ítem a partir de los idiomas detectados. Función pura: toda la política
 * está aquí, y las llamadas al modelo quedan fuera. Sin `langs` responde 'needs-detection' salvo
 * que el ítem se pueda descartar de antemano.
 *
 * Los dos títulos iguales no son un caso aparte: si son "Moon Knight"/"Moon Knight" el modelo los
 * marca como inglés y se rehace `name` en español, igual que cualquier otro par en un solo idioma.
 * Lo que los salva de inventarse una traducción es `translatable` ("Dune" sigue siendo "Dune").
 */
export function decideAction({ name, enName, langs, skipIdentical = false }) {
  const trivial = trivialSkip(name, enName, { skipIdentical });
  if (trivial) return { action: 'skip', reason: trivial };
  if (!langs) return { action: 'needs-detection' };

  const { name: a, enName: b, translatable } = langs;
  if (a === 'es' && b === 'en') return { action: 'ok' };
  if (a === 'en' && b === 'es') return { action: 'swap' };

  if (a === 'es' && b === 'es') {
    // El español ya está en su sitio; falta la versión inglesa.
    return translatable
      ? { action: 'translate', field: 'enName', to: 'en', from: name }
      : { action: 'skip', reason: 'ambos en español, título no traducible' };
  }
  if (a === 'en' && b === 'en') {
    // El inglés se queda en enName y hay que rehacer el español.
    return translatable
      ? { action: 'translate', field: 'name', to: 'es', from: enName }
      : { action: 'skip', reason: 'ambos en inglés, título no traducible' };
  }

  return { action: 'skip', reason: `idiomas no concluyentes (${a}/${b})` };
}

// ----------------------------------------------------------------- Ítems ---

/**
 * Revisa un ítem y aplica la corrección. Con dryRun no modifica nada: solo devuelve la decisión.
 * Devuelve { action, changed, detail }.
 */
export async function fixItem(item, { dryRun = false, skipIdentical = false } = {}) {
  const name = item.name ?? '';
  const enName = item.enName ?? '';

  // Casos resolubles sin gastar una llamada al modelo.
  const trivial = decideAction({ name, enName, langs: null, skipIdentical });
  if (trivial.action === 'skip') return { ...trivial, changed: false };

  const langs = await detectLanguages(name, enName);
  const decision = decideAction({ name, enName, langs, skipIdentical });

  if (decision.action === 'ok' || decision.action === 'skip') {
    if (!dryRun) item[FLAG] = true;
    return { ...decision, changed: !dryRun, detail: `${langs.name}/${langs.enName}` };
  }

  if (decision.action === 'swap') {
    if (!dryRun) {
      item.name = enName;
      item.enName = name;
      item[FLAG] = true;
    }
    return { action: 'swap', changed: true, detail: `"${name}" ⇄ "${enName}"` };
  }

  const translated = await translateTitle(decision.from, decision.to);
  if (!translated) {
    return { action: 'skip', reason: 'traducción descartada', changed: false };
  }
  if (translated.trim().toLowerCase() === decision.from.trim().toLowerCase()) {
    // El modelo devolvió lo mismo: el título no cambia entre idiomas.
    if (!dryRun) item[FLAG] = true;
    return { action: 'skip', reason: 'la traducción coincide con el original', changed: !dryRun };
  }
  if (!dryRun) {
    item[decision.field] = translated;
    item[FLAG] = true;
  }
  return {
    action: 'translate',
    changed: true,
    detail: `${decision.field} = "${translated}" (desde "${decision.from}")`,
  };
}

// ------------------------------------------------------------------ Main ---

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const skipIdentical = process.argv.includes('--skip-identical');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog.items || [];
  const pending = (force ? items : items.filter((i) => i[FLAG] !== true)).slice(0, limit);

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
      // Sin marcar: un fallo de Ollama debe poder reintentarse en la siguiente pasada.
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

// Solo se ejecuta como script; al importarlo (tests) se exponen las funciones.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}
