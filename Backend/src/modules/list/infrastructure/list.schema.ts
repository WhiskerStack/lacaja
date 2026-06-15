import { integer, pgTable, real, serial, text } from 'drizzle-orm/pg-core';
import { users } from '../../account/infrastructure/account.schema';

// "Mi lista" persistida del usuario (modelo de datos LIST / LIST_ITEM).
export const lists = pgTable('list', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  availableSpaceGb: real('available_space_gb'),
});

// El ítem referencia el nivel exacto por FK + guarda el code legible (modelo de datos §3.2).
export const listItems = pgTable('list_item', {
  id: serial('id').primaryKey(),
  listId: integer('list_id')
    .notNull()
    .references(() => lists.id, { onDelete: 'cascade' }),
  level: text('level').notNull(), // 'audiovisual' | 'season' | 'episode'
  audiovisualId: integer('audiovisual_id'),
  seasonId: integer('season_id'),
  episodeId: integer('episode_id'),
  code: text('code').notNull(),
  // Snapshots para reconstruir totales sin depender del catálogo vivo.
  name: text('name').notNull().default(''),
  sizeGb: real('size_gb').notNull().default(0),
  price: real('price').notNull().default(0),
});
