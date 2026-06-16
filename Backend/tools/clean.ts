import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/shared/database/schema';

/**
 * Borra TODOS los datos de la base de datos (todas las tablas del esquema `public`),
 * reiniciando las secuencias de identidad. NO toca las migraciones de Drizzle
 * (que viven en el esquema `drizzle`), así que el esquema queda intacto y listo
 * para volver a sembrar con `pnpm seed`.
 *
 *   pnpm clean
 */
async function clean(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Borrando todos los datos de la base de datos...');

  // Descubrimos las tablas reales del esquema `public` en tiempo de ejecución,
  // así no hay que mantener una lista a mano cuando se añaden módulos/tablas.
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = rows.map((r) => r.tablename);

  if (tables.length === 0) {
    console.log('No hay tablas que limpiar.');
    await pool.end();
    return;
  }

  // TRUNCATE ... CASCADE resuelve las FKs en cualquier orden y RESTART IDENTITY
  // reinicia los serial a 1. Una sola sentencia => transacción implícita atómica.
  const identifiers = tables.map((t) => `"public"."${t}"`).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`));

  console.log(`Limpieza completada. Tablas vaciadas: ${tables.join(', ')}`);
  await pool.end();
}

clean().catch((err) => {
  console.error('Clean falló:', err);
  process.exit(1);
});
