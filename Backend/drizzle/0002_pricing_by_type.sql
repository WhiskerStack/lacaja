-- Tarifas por tipo de audiovisual (funcional §8): PRICE_RATE pasa de clave única (key)
-- a clave única compuesta (type, key). Migración HECHA A MANO (como 0001_search.sql),
-- idempotente. Ejecutar DESPUÉS de `drizzle-kit migrate`.

-- 1) Nueva columna `type`. Las filas previas (normal/premiere globales) se asignan a 'movie'.
ALTER TABLE price_rate
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'movie';
ALTER TABLE price_rate
  ALTER COLUMN type DROP DEFAULT;

-- 2) Reemplaza la unicidad por (type, key).
ALTER TABLE price_rate
  DROP CONSTRAINT IF EXISTS price_rate_key_unique;
ALTER TABLE price_rate
  DROP CONSTRAINT IF EXISTS price_rate_type_key_unique;
ALTER TABLE price_rate
  ADD CONSTRAINT price_rate_type_key_unique UNIQUE (type, key);

-- 3) Siembra las tarifas faltantes por tipo (normal 10 / estreno 20), sin pisar lo existente.
INSERT INTO price_rate (type, key, price_cup) VALUES
  ('movie', 'normal', 10),      ('movie', 'premiere', 20),
  ('series', 'normal', 10),     ('series', 'premiere', 20),
  ('telenovela', 'normal', 10), ('telenovela', 'premiere', 20),
  ('show', 'normal', 10),       ('show', 'premiere', 20),
  ('anime', 'normal', 10),      ('anime', 'premiere', 20)
ON CONFLICT (type, key) DO NOTHING;
