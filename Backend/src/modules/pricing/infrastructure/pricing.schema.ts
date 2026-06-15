import { pgTable, real, serial, text, unique } from 'drizzle-orm/pg-core';

// Tarifa configurable por tipo (modelo de datos PRICE_RATE). Una fila por (type, key).
// type: 'movie' | 'series' | ...  key: 'normal' | 'premiere'. Moneda CUP.
export const priceRates = pgTable(
  'price_rate',
  {
    id: serial('id').primaryKey(),
    type: text('type').notNull(),
    key: text('key').notNull(),
    priceCup: real('price_cup').notNull(),
  },
  (t) => ({
    typeKeyUnique: unique('price_rate_type_key_unique').on(t.type, t.key),
  }),
);
