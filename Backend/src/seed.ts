import 'dotenv/config';
import { audiovisualCode } from '@daher/domain';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/database/schema';

/**
 * Siembra datos de demostración: géneros, regiones, idiomas, tarifas por defecto
 * (normal 10, estreno 20), unas películas y un episódico con temporadas/capítulos.
 * Ejecutar tras las migraciones (`pnpm db:migrate` + drizzle/0001_search.sql).
 *   pnpm seed
 */
async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Sembrando datos de demostración...');

  // Tarifas por defecto.
  await db
    .insert(schema.priceRates)
    .values([
      { key: 'normal', priceCup: 10 },
      { key: 'premiere', priceCup: 20 },
    ])
    .onConflictDoNothing();

  // Catálogos de filtrado.
  const [accion] = await db.insert(schema.genres).values({ name: 'Acción' }).returning();
  const [drama] = await db.insert(schema.genres).values({ name: 'Drama' }).returning();
  const [fantasia] = await db.insert(schema.genres).values({ name: 'Fantasía' }).returning();
  const [usa] = await db.insert(schema.regions).values({ name: 'Estados Unidos' }).returning();
  const [esp] = await db.insert(schema.languages).values({ name: 'Español' }).returning();
  const [eng] = await db.insert(schema.languages).values({ name: 'Inglés' }).returning();

  // Reparto.
  const [actor1] = await db.insert(schema.castMembers).values({ name: 'Keanu Reeves' }).returning();
  const [actor2] = await db.insert(schema.castMembers).values({ name: 'Emilia Clarke' }).returning();

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
    const [row] = await db.insert(schema.audiovisuals).values(m).returning();
    await db
      .update(schema.audiovisuals)
      .set({ code: audiovisualCode('movie', row.id) })
      .where(eq(schema.audiovisuals.id, row.id));
    await db.insert(schema.audiovisualCast).values({ audiovisualId: row.id, castMemberId: actor1.id });
  }

  // Episódico (serie) con temporadas y capítulos.
  const [got] = await db
    .insert(schema.audiovisuals)
    .values({
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
    })
    .returning();
  await db
    .update(schema.audiovisuals)
    .set({ code: audiovisualCode('series', got.id) })
    .where(eq(schema.audiovisuals.id, got.id));
  await db.insert(schema.audiovisualCast).values({ audiovisualId: got.id, castMemberId: actor2.id });

  const [s1] = await db
    .insert(schema.seasons)
    .values({ audiovisualId: got.id, number: 1, sizeGb: 0 })
    .returning();
  await db.insert(schema.episodes).values([
    { seasonId: s1.id, number: 1, sizeGb: 1.5, durationMin: 62 },
    { seasonId: s1.id, number: 2, sizeGb: 1.4, durationMin: 56 },
  ]);
  const [s2] = await db
    .insert(schema.seasons)
    .values({ audiovisualId: got.id, number: 2, sizeGb: 0 })
    .returning();
  await db.insert(schema.episodes).values([
    { seasonId: s2.id, number: 1, sizeGb: 1.6, durationMin: 53 },
  ]);

  await db.insert(schema.trailers).values({ audiovisualId: got.id, youtubeId: 'KPLWWIOCOOQ' });

  console.log('Seed completado. Código de la serie:', audiovisualCode('series', got.id));
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed falló:', err);
  process.exit(1);
});
