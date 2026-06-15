import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE } from './database.tokens';
import * as schema from './schema';

/**
 * Provee la instancia de Drizzle (token DRIZZLE) a todo el backend.
 * @Global: cualquier módulo la inyecta sin reimportar este módulo.
 * Una sola DATABASE_URL a Postgres (sin pooler/doble-cadena; arquitectura §7.3, stack §3).
 */
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({ connectionString: config.get<string>('DATABASE_URL') });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
