-- Búsqueda léxica: FTS (tsvector) + pg_trgm (búsqueda §3). Migración HECHA A MANO porque
-- las columnas generadas con pesos y las extensiones son incómodas de expresar en Drizzle.
-- Ejecutar DESPUÉS de `drizzle-kit migrate` (que crea las tablas). Idempotente.

-- 1) Extensión de trigramas (FTS viene de serie en Postgres, no requiere extensión).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Columna tsvector generada y mantenida por Postgres. Pesos: título A, géneros B,
--    reparto C, descripción D (búsqueda §3.1). Géneros y reparto se materializan en
--    columnas de texto auxiliares para no depender de JOINs en la expresión generada.
ALTER TABLE audiovisual
  ADD COLUMN IF NOT EXISTS genres_text text NOT NULL DEFAULT '';
ALTER TABLE audiovisual
  ADD COLUMN IF NOT EXISTS cast_text text NOT NULL DEFAULT '';

ALTER TABLE audiovisual
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE audiovisual
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(genres_text, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(cast_text, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'D')
  ) STORED;

-- 3) Índices (búsqueda §3.2). GIN para FTS y trigramas; el code ya tiene su índice B-tree
--    desde el esquema Drizzle (audiovisual_code_idx).
CREATE INDEX IF NOT EXISTS audiovisual_search_idx
  ON audiovisual USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS audiovisual_name_trgm_idx
  ON audiovisual USING GIN (name gin_trgm_ops);
