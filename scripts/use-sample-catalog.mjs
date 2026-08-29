#!/usr/bin/env node
// Fija src/data/catalog.json al catálogo de muestra versionado (sin tocar el backend).
// Se usa en test/lint para que sean DETERMINISTAS e independientes de la BD: los tests
// dependen de ids fijos del sample (p. ej. S1122). dev/build sí sincronizan desde el backend.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SAMPLE = resolve(ROOT, 'src/data/catalog.sample.json');
const OUT = resolve(ROOT, 'src/data/catalog.json');

writeFileSync(OUT, readFileSync(SAMPLE, 'utf8'));
// eslint-disable-next-line no-console
console.log('[dahem] use-sample-catalog: src/data/catalog.json = catalog.sample.json (fixture)');
