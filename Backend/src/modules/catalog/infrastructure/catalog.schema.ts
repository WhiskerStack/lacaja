import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
} from 'drizzle-orm/pg-core';
import type { AudiovisualType } from '@dahem/domain';

// Catálogos de filtrado (modelo de datos §3): género, región, idioma.
export const genres = pgTable('genre', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const regions = pgTable('region', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const languages = pgTable('language', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

/**
 * Entidad raíz del catálogo y contenedor episódico (modelo de datos §3.1).
 * `code` se materializa para la búsqueda por código (búsqueda §2.4) y como etiqueta.
 * `search_vector` (tsvector generado) se añade en la migración SQL hecha a mano
 * (drizzle/0001_search.sql), por lo difícil que es expresar columnas generadas + pesos en Drizzle.
 */
export const audiovisuals = pgTable(
  'audiovisual',
  {
    id: serial('id').primaryKey(),
    type: text('type').$type<AudiovisualType>().notNull(),
    name: text('name').notNull(),
    year: integer('year').notNull(),
    rating: real('rating').notNull(),
    sizeGb: real('size_gb').notNull().default(0), // solo significativo si no es episódico
    durationMin: integer('duration_min'), // solo película
    isPremiere: boolean('is_premiere').notNull().default(false),
    description: text('description').notNull().default(''),
    sourceImageUrl: text('source_image_url'),
    code: text('code').notNull().default(''),
    // FKs internas: NO se exponen al allowlist por defecto (arquitectura §5.3).
    genreId: integer('genre_id').references(() => genres.id),
    regionId: integer('region_id').references(() => regions.id),
    languageId: integer('language_id').references(() => languages.id),
  },
  (t) => ({
    codeIdx: index('audiovisual_code_idx').on(t.code),
  }),
);

export const seasons = pgTable('season', {
  id: serial('id').primaryKey(),
  audiovisualId: integer('audiovisual_id')
    .notNull()
    .references(() => audiovisuals.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  sizeGb: real('size_gb').notNull().default(0),
});

export const episodes = pgTable('episode', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id')
    .notNull()
    .references(() => seasons.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  sizeGb: real('size_gb').notNull().default(0),
  durationMin: integer('duration_min'),
});

export const trailers = pgTable('trailer', {
  id: serial('id').primaryKey(),
  audiovisualId: integer('audiovisual_id')
    .notNull()
    .references(() => audiovisuals.id, { onDelete: 'cascade' }),
  youtubeId: text('youtube_id').notNull(),
});

export const castMembers = pgTable('cast_member', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

// N:M audiovisual ↔ cast_member (modelo de datos §3).
export const audiovisualCast = pgTable(
  'audiovisual_cast',
  {
    audiovisualId: integer('audiovisual_id')
      .notNull()
      .references(() => audiovisuals.id, { onDelete: 'cascade' }),
    castMemberId: integer('cast_member_id')
      .notNull()
      .references(() => castMembers.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.audiovisualId, t.castMemberId] }),
  }),
);
