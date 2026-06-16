import 'dotenv/config';
import { audiovisualCode } from '@dahem/domain';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/shared/database/schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Siembra datos de demostración: géneros, regiones, idiomas, tarifas por defecto
 * (normal 10, estreno 20), unas películas y un episódico con temporadas/capítulos.
 *
 * Es IDEMPOTENTE: cada registro se busca antes de insertarse, así que ejecutar
 * `pnpm seed` varias veces no duplica datos. Ejecutar tras las migraciones
 * (`pnpm db:migrate` + drizzle/0001_search.sql).
 *   pnpm seed
 */

/** Busca una fila de catálogo por nombre; si no existe la inserta. Devuelve la fila. */
async function ensureNamed(
  db: Db,
  table: typeof schema.genres | typeof schema.regions | typeof schema.languages | typeof schema.castMembers,
  name: string,
): Promise<{ id: number; name: string }> {
  const [existing] = await db.select().from(table).where(eq(table.name, name)).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(table).values({ name }).returning();
  return row;
}

/** Busca un audiovisual por nombre+tipo; si no existe lo inserta y materializa su `code`. */
async function ensureAudiovisual(
  db: Db,
  values: typeof schema.audiovisuals.$inferInsert,
): Promise<{ id: number }> {
  const [existing] = await db
    .select()
    .from(schema.audiovisuals)
    .where(and(eq(schema.audiovisuals.name, values.name), eq(schema.audiovisuals.type, values.type)))
    .limit(1);
  if (existing) return existing;
  const [row] = await db.insert(schema.audiovisuals).values(values).returning();
  await db
    .update(schema.audiovisuals)
    .set({ code: audiovisualCode(values.type as 'movie' | 'series', row.id) })
    .where(eq(schema.audiovisuals.id, row.id));
  return row;
}

async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Sembrando datos de demostración (idempotente)...');

  // Tarifas por defecto: normal 10 / estreno 20 para cada tipo de audiovisual.
  const types = ['movie', 'series', 'telenovela', 'show', 'anime'] as const;
  await db
    .insert(schema.priceRates)
    .values(
      types.flatMap((type) => [
        { type, key: 'normal', priceCup: 10 },
        { type, key: 'premiere', priceCup: 20 },
      ]),
    )
    .onConflictDoNothing();

  // Catálogos de filtrado.
  const accion = await ensureNamed(db, schema.genres, 'Acción');
  const drama = await ensureNamed(db, schema.genres, 'Drama');
  const fantasia = await ensureNamed(db, schema.genres, 'Fantasía');
  const usa = await ensureNamed(db, schema.regions, 'Estados Unidos');
  const esp = await ensureNamed(db, schema.languages, 'Español');
  const eng = await ensureNamed(db, schema.languages, 'Inglés');

  // Reparto.
  const actor1 = await ensureNamed(db, schema.castMembers, 'Keanu Reeves');
  const actor2 = await ensureNamed(db, schema.castMembers, 'Emilia Clarke');

  // Películas.
  const movies = [
    {
      type: 'movie',
      name: 'The Matrix',
      year: 1999,
      rating: 8.7,
      sizeGb: 2.1,
      durationMin: 136,
      isPremiere: false,
      description: 'Un hacker descubre la verdad sobre su realidad.',
      genreId: accion.id,
      regionId: usa.id,
      languageId: eng.id,
    },
    {
      type: 'movie',
      name: 'El Gigante de Hierro',
      year: 1999,
      rating: 8.0,
      sizeGb: 1.2,
      durationMin: 86,
      isPremiere: false,
      description: 'Un niño se hace amigo de un robot gigante.',
      genreId: fantasia.id,
      regionId: usa.id,
      languageId: esp.id,
    },
    {
      type: 'movie',
      name: 'Estreno Reciente',
      year: 2025,
      rating: 7.5,
      sizeGb: 3.4,
      durationMin: 120,
      isPremiere: true,
      description: 'Una superproducción de estreno.',
      genreId: accion.id,
      regionId: usa.id,
      languageId: eng.id,
    },
  ] as const;

  for (const m of movies) {
    const row = await ensureAudiovisual(db, m);
    await db
      .insert(schema.audiovisualCast)
      .values({ audiovisualId: row.id, castMemberId: actor1.id })
      .onConflictDoNothing();
  }

  // Episódico (serie) con temporadas y capítulos.
  const got = await ensureAudiovisual(db, {
    type: 'series',
    name: 'Juego de Tronos',
    year: 2011,
    rating: 9.2,
    sizeGb: 0,
    isPremiere: false,
    description: 'Familias nobles luchan por el Trono de Hierro.',
    genreId: drama.id,
    regionId: usa.id,
    languageId: eng.id,
  });
  await db
    .insert(schema.audiovisualCast)
    .values({ audiovisualId: got.id, castMemberId: actor2.id })
    .onConflictDoNothing();

  const s1 = await ensureSeason(db, got.id, 1);
  await ensureEpisode(db, s1.id, 1, 1.5, 62);
  await ensureEpisode(db, s1.id, 2, 1.4, 56);
  const s2 = await ensureSeason(db, got.id, 2);
  await ensureEpisode(db, s2.id, 1, 1.6, 53);

  await ensureTrailer(db, got.id, 'KPLWWIOCOOQ');

  console.log('Seed completado. Código de la serie:', audiovisualCode('series', got.id));
  await pool.end();
}

/** Busca una temporada por audiovisual+número; si no existe la inserta. */
async function ensureSeason(db: Db, audiovisualId: number, number: number): Promise<{ id: number }> {
  const [existing] = await db
    .select()
    .from(schema.seasons)
    .where(and(eq(schema.seasons.audiovisualId, audiovisualId), eq(schema.seasons.number, number)))
    .limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(schema.seasons)
    .values({ audiovisualId, number, sizeGb: 0 })
    .returning();
  return row;
}

/** Busca un capítulo por temporada+número; si no existe lo inserta. */
async function ensureEpisode(
  db: Db,
  seasonId: number,
  number: number,
  sizeGb: number,
  durationMin: number,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(schema.episodes)
    .where(and(eq(schema.episodes.seasonId, seasonId), eq(schema.episodes.number, number)))
    .limit(1);
  if (existing) return;
  await db.insert(schema.episodes).values({ seasonId, number, sizeGb, durationMin });
}

/** Busca un trailer por audiovisual+youtubeId; si no existe lo inserta. */
async function ensureTrailer(db: Db, audiovisualId: number, youtubeId: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(schema.trailers)
    .where(
      and(eq(schema.trailers.audiovisualId, audiovisualId), eq(schema.trailers.youtubeId, youtubeId)),
    )
    .limit(1);
  if (existing) return;
  await db.insert(schema.trailers).values({ audiovisualId, youtubeId });
}

seed().catch((err) => {
  console.error('Seed falló:', err);
  process.exit(1);
});
