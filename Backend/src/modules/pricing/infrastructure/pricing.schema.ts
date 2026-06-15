import { pgTable, real, serial, text } from 'drizzle-orm/pg-core';

// Tarifa configurable (modelo de datos PRICE_RATE). key: 'normal' | 'premiere'. Moneda CUP.
export const priceRates = pgTable('price_rate', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  priceCup: real('price_cup').notNull(),
});
