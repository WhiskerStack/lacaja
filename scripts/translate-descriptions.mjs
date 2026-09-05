#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasFlag, setFlag, normalizeCatalogMetadata } from './lib/metadata.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'src/data/catalog.json');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const DELAY_MS = 1000; // pausa entre peticiones
const SAVE_EVERY = 5;   // guarda cada N traducciones

/**
 * Envía una descripción a Ollama para que la traduzca al español.
 */
async function translateDescription(text) {
  if (!text || text.trim() === '') return '';
  const prompt = `Traduce la siguiente descripción al español, sin añadir comentarios adicionales, solo la traducción:\n\n${text}`;
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: prompt,
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Ollama respondió con ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  return data.response.trim();
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const items = catalog.items || [];
  // Absorbe las banderas sueltas del formato antiguo antes de decidir qué está pendiente.
  normalizeCatalogMetadata(catalog);

  const toTranslate = items.filter(
    (item) =>
      !hasFlag(item, 'translated') && item.description && item.description.trim() !== ''
  );

  console.log(`📚 Total items: ${items.length}`);
  console.log(`🌐 Pendientes de traducir: ${toTranslate.length}`);

  let processed = 0;
  for (const item of toTranslate) {
    const code = item.code || item.id;
    try {
      console.log(`🔄 [${processed + 1}/${toTranslate.length}] Traduciendo ${code} - ${item.name}`);
      const translated = await translateDescription(item.description);
      item.description = translated;
      setFlag(item, 'translated');
      processed++;

      if (processed % SAVE_EVERY === 0) {
        writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
        console.log(`💾 Progreso guardado (${processed} traducciones)`);
      }

      // Pequeña pausa para no saturar Ollama
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    } catch (err) {
      console.error(`❌ Error con ${code}:`, err.message);
      // Opcional: puedes marcar como fallido para no repetirlo en la siguiente ejecución
      // setFlag(item, 'translated', false); // si quieres reintentar luego
    }
  }

  // Guardado final
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(`✅ Traducciones completadas: ${processed}`);
}

main().catch(console.error);