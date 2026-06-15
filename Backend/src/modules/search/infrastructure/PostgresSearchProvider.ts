import { isCode } from '@dahem/domain';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import {
  SearchOptions,
  SearchProvider,
  SearchResult,
} from '../../catalog/domain/SearchProvider';

interface Row {
  id: number;
  code: string;
  name: string;
  type: string;
  year: number;
  score?: number;
  [key: string]: unknown;
}

/**
 * Implementación Postgres de SearchProvider (búsqueda §2-3): FTS (tsvector) + pg_trgm,
 * con ruteo por código a match exacto/prefijo. El tsvector `search_vector` y los índices
 * GIN se crean en la migración SQL hecha a mano (drizzle/0001_search.sql).
 */
@Injectable()
export class PostgresSearchProvider extends SearchProvider {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const limit = opts.limit ?? 50;

    // Caso especial (búsqueda §2.4): la query es un código → match exacto/prefijo, sin FTS.
    if (isCode(q)) {
      const code = q.toUpperCase();
      const rows = await this.db.execute<Row>(sql`
        SELECT id, code, name, type, year
        FROM audiovisual
        WHERE code = ${code} OR code LIKE ${code + '-%'}
        ORDER BY code
        LIMIT ${limit}
      `);
      return this.toResults(rows);
    }

    // Búsqueda léxica híbrida: FTS (peso 0.7) + trigrama sobre el título (peso 0.3).
    const rows = await this.db.execute<Row>(sql`
      SELECT id, code, name, type, year,
        GREATEST(
          ts_rank(search_vector, plainto_tsquery('spanish', ${q})) * 0.7,
          similarity(name, ${q}) * 0.3
        ) AS score
      FROM audiovisual
      WHERE search_vector @@ plainto_tsquery('spanish', ${q})
         OR name % ${q}
      ORDER BY score DESC
      LIMIT ${limit}
    `);
    return this.toResults(rows);
  }

  async suggest(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const limit = opts.limit ?? 8;

    // As-you-type (búsqueda §3.3): sólo título, prefijo primero + trigrama; pocos resultados.
    const rows = await this.db.execute<Row>(sql`
      SELECT id, code, name, type, year
      FROM audiovisual
      WHERE name ILIKE ${q + '%'} OR name % ${q}
      ORDER BY
        CASE WHEN name ILIKE ${q + '%'} THEN 0 ELSE 1 END,
        similarity(name, ${q}) DESC
      LIMIT ${limit}
    `);
    return this.toResults(rows);
  }

  private toResults(result: { rows: Row[] }): SearchResult[] {
    return result.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      year: r.year,
      score: r.score,
    }));
  }
}
