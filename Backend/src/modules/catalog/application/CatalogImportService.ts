import { Inject, Injectable } from '@nestjs/common';
import { type AudiovisualType } from '@dahem/domain';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import {
  audiovisuals,
  episodes,
  genres,
  seasons,
} from '../infrastructure/catalog.schema';

/** Capítulo de una temporada en la importación. */
export interface ImportEpisode {
  number: number;
  sizeGb?: number;
  durationMin?: number;
}

/** Temporada con sus capítulos en la importación. */
export interface ImportSeason {
  number: number;
  sizeGb?: number;
  episodes?: ImportEpisode[];
}

/** Un audiovisual a importar desde el inventario físico. */
export interface ImportItem {
  code: string; // código del inventario y clave de dedup (P1, S2...)
  type: AudiovisualType;
  name: string;
  year: number;
  rating?: number;
  sizeGb?: number;
  isPremiere?: boolean;
  durationMin?: number;
  description?: string;
  posterUrl?: string;
  genre?: string;
  seasons?: ImportSeason[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  createdCodes: string[];
  skippedCodes: string[];
}

/**
 * Importación masiva del inventario físico (datos producidos por el SearchEngine).
 * Deduplica por `code`: si el código del inventario (P1, S2...) ya existe en BD se
 * omite; en caso contrario inserta el audiovisual (+ temporadas y capítulos si es
 * episódico), resolviendo el género por nombre (lo crea si no existe). Todo en una
 * transacción.
 *
 * Escribe directo por Drizzle (como tools/seed.ts) porque necesita columnas que el
 * dominio de 7 campos no expone (description, sourceImageUrl, genreId) y porque el
 * `code` aquí viene del inventario físico, no se autogenera del id.
 */
@Injectable()
export class CatalogImportService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async import(items: ImportItem[]): Promise<ImportResult> {
    const result: ImportResult = { created: 0, skipped: 0, createdCodes: [], skippedCodes: [] };

    await this.db.transaction(async (tx) => {
      // Cache de géneros por nombre dentro de la transacción.
      const genreCache = new Map<string, number>();

      for (const item of items) {
        const code = item.code.trim();
        if (!code) continue;

        // Dedup por el código del inventario (es el mismo `code` del catálogo).
        const [existing] = await tx
          .select({ id: audiovisuals.id })
          .from(audiovisuals)
          .where(eq(audiovisuals.code, code))
          .limit(1);
        if (existing) {
          result.skipped++;
          result.skippedCodes.push(code);
          continue;
        }

        const genreId = item.genre
          ? await this.resolveGenre(tx, item.genre.trim(), genreCache)
          : undefined;

        const isEpisodic = item.type !== 'movie';
        const [inserted] = await tx
          .insert(audiovisuals)
          .values({
            type: item.type,
            name: item.name,
            year: item.year,
            rating: clampRating(item.rating),
            sizeGb: item.sizeGb ?? 0,
            durationMin: isEpisodic ? null : item.durationMin ?? null,
            isPremiere: item.isPremiere ?? false,
            description: item.description ?? '',
            sourceImageUrl: item.posterUrl || null,
            // El código viene del inventario físico (no se autogenera del id serial).
            code,
            genreId,
          })
          .returning({ id: audiovisuals.id });

        if (isEpisodic && item.seasons?.length) {
          await this.insertSeasons(tx, inserted.id, item.seasons);
        }

        result.created++;
        result.createdCodes.push(code);
      }
    });

    return result;
  }

  private async resolveGenre(
    tx: DbOrTx,
    name: string,
    cache: Map<string, number>,
  ): Promise<number | undefined> {
    if (!name) return undefined;
    const cached = cache.get(name);
    if (cached) return cached;

    const [existing] = await tx.select().from(genres).where(eq(genres.name, name)).limit(1);
    if (existing) {
      cache.set(name, existing.id);
      return existing.id;
    }
    const [created] = await tx.insert(genres).values({ name }).returning();
    cache.set(name, created.id);
    return created.id;
  }

  private async insertSeasons(tx: DbOrTx, audiovisualId: number, seasonList: ImportSeason[]): Promise<void> {
    for (const s of seasonList) {
      const [season] = await tx
        .insert(seasons)
        .values({ audiovisualId, number: s.number, sizeGb: s.sizeGb ?? 0 })
        .returning({ id: seasons.id });

      if (s.episodes?.length) {
        await tx.insert(episodes).values(
          s.episodes.map((ep) => ({
            seasonId: season.id,
            number: ep.number,
            sizeGb: ep.sizeGb ?? 0,
            durationMin: ep.durationMin ?? null,
          })),
        );
      }
    }
  }
}

/** El callback de `db.transaction` recibe una tx con la misma forma que la db. */
type DbOrTx = Parameters<Parameters<Database['transaction']>[0]>[0];

function clampRating(rating?: number): number {
  if (rating === undefined || Number.isNaN(rating)) return 0;
  return Math.min(10, Math.max(0, rating));
}
