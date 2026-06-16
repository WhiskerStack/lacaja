-- Clientes del sistema (USER): código inmutable U{id} y bandera de veto. Migración
-- HECHA A MANO (como 0001_search.sql y 0002_pricing_by_type.sql), idempotente.
-- Ejecutar DESPUÉS de `drizzle-kit migrate` (o aplicar con `psql -f`).

-- 1) Nuevas columnas. `code` arranca vacío y se rellena abajo; `banned` por defecto false.
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS code text NOT NULL DEFAULT '';
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- 2) Backfill del código de los clientes ya existentes: U + id (p. ej. U123).
--    Inmutable: solo se asigna donde aún está vacío.
UPDATE "user" SET code = 'U' || id WHERE code = '';
