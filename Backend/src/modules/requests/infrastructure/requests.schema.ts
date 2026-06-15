import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { users } from '../../account/infrastructure/account.schema';

// Solicitud de contenido no disponible (modelo de datos REQUEST). status: pending|available|notified.
export const requests = pgTable('request', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  searchText: text('search_text').notNull(),
  status: text('status').notNull().default('pending'),
});
