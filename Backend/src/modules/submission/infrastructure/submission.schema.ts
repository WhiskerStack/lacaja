import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from '../../account/infrastructure/account.schema';

// Envío de lista por web: snapshot congelado (modelo de datos WEB_SUBMISSION).
export const webSubmissions = pgTable('web_submission', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  submissionCode: text('submission_code').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  totalGb: real('total_gb').notNull().default(0),
  totalPrice: real('total_price').notNull().default(0),
});

// Ítems congelados del envío (modelo de datos SUBMISSION_ITEM): datos copiados, no FK al catálogo vivo.
export const submissionItems = pgTable('submission_item', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => webSubmissions.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  sizeGb: real('size_gb').notNull().default(0),
  price: real('price').notNull().default(0),
});
