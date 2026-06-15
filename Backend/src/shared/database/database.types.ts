import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

/** Tipo de la instancia de Drizzle inyectada por el token DRIZZLE, con el esquema completo. */
export type Database = NodePgDatabase<typeof schema>;
