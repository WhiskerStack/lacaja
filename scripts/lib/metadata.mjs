// scripts/lib/metadata.mjs
// Acceso único a `item.metadata`: las banderas que dicen qué procesos ya corrieron
// sobre un ítem (enriquecido con TMDB, descripción traducida, géneros enriquecidos,
// títulos revisados) viven agrupadas ahí. No describen al audiovisual —son estado
// del pipeline de datos— y por eso no se mezclan con name/year/genres/rating.
//
// Todos los scripts leen y escriben a través de estos helpers para que la forma del
// JSON no se bifurque, y normalizan al arrancar para absorber el formato antiguo
// (banderas sueltas en la raíz del ítem).

/** Banderas conocidas del pipeline. Cualquier otra clave dentro de metadata se respeta. */
export const METADATA_FLAGS = ['enriched', 'translated', 'genresEnriched', 'titlesChecked'];

/** metadata del ítem, siempre como objeto (aunque el ítem aún no lo traiga). */
export function getMetadata(item) {
  return item.metadata ?? {};
}

/** ¿Ya corrió el proceso `flag` sobre este ítem? Ausente = false (= pendiente). */
export function hasFlag(item, flag) {
  return getMetadata(item)[flag] === true;
}

/**
 * Marca (o desmarca) una bandera. Se guarda en formato disperso: solo los `true` se
 * escriben y un `false` borra la clave, porque "ausente" ya significaba "pendiente"
 * en todo el pipeline y así el JSON no engorda con banderas en false.
 * Devuelve true si el ítem cambió.
 */
export function setFlag(item, flag, value = true) {
  if (!item.metadata || typeof item.metadata !== 'object') item.metadata = {};
  const had = item.metadata[flag] === true;
  if (value) {
    if (had) return false;
    item.metadata[flag] = true;
  } else {
    if (!(flag in item.metadata)) return false;
    delete item.metadata[flag];
  }
  return true;
}

/** Atajo para marcar varias banderas de una vez. Devuelve true si algo cambió. */
export function setFlags(item, flags, value = true) {
  let changed = false;
  for (const flag of flags) {
    if (setFlag(item, flag, value)) changed = true;
  }
  return changed;
}

/**
 * Lleva un ítem al formato nuevo: garantiza `metadata` y absorbe las banderas sueltas
 * de la raíz (formato antiguo: item.enriched, item.translated, item.genresEnriched,
 * item.titlesChecked). Idempotente. Devuelve true si el ítem cambió.
 */
export function normalizeItemMetadata(item) {
  let changed = false;
  if (!item.metadata || typeof item.metadata !== 'object') {
    item.metadata = {};
    changed = true;
  }
  for (const flag of METADATA_FLAGS) {
    if (flag in item) {
      if (item[flag] === true) setFlag(item, flag, true);
      delete item[flag];
      changed = true;
    }
  }
  return changed;
}

/** Normaliza todos los ítems del catálogo. Devuelve cuántos cambiaron. */
export function normalizeCatalogMetadata(catalog) {
  let migrated = 0;
  for (const item of catalog.items ?? []) {
    if (normalizeItemMetadata(item)) migrated++;
  }
  return migrated;
}

/** metadata inicial de un ítem recién creado: nada procesado todavía. */
export function emptyMetadata() {
  return {};
}
