import { Inject, Injectable } from '@nestjs/common';
import { audiovisualCode, type AudiovisualType } from '@dahem/domain';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import {
  audiovisualCast,
  audiovisuals,
  castMembers,
  episodes,
  genres,
  languages,
  regions,
  seasons,
  trailers,
} from './catalog.schema';

/** Capítulo en la exportación (forma plana que consume el Landing). */
export interface CatalogExportEpisode {
  id: number;
  number: number;
  sizeGb: number;
  durationMin?: number;
}

/** Temporada en la exportación. */
export interface CatalogExportSeason {
  id: number;
  number: number;
  episodes: CatalogExportEpisode[];
}

/** Item completo del catálogo, desnormalizado para el SSG del Landing. */
export interface CatalogExportItem {
  id: number;
  /** Código del inventario/catálogo (P1, S2...). Fuente de verdad para el Landing. */
  code: string;
  type: string;
  name: string;
  year: number;
  rating: number;
  sizeGb: number;
  durationMin?: number;
  isPremiere: boolean;
  genre: string;
  region: string;
  language: string;
  description: string;
  imageUrl: string;
  cast: string[];
  trailers: string[];
  seasons?: CatalogExportSeason[];
}

/** Volcado completo del catálogo (misma forma que Landing/src/data/catalog.sample.json). */
export interface CatalogExport {
  version: number;
  genres: string[];
  regions: string[];
  languages: string[];
  items: CatalogExportItem[];
}

/**
 * Construye el volcado COMPLETO del catálogo para que el Landing lo materialice en build-time
 * (SSG). Lee la tabla `audiovisual` directamente porque el dominio/allowlist no exponen
 * description, imagen ni FKs. Ensambla en memoria con pocas consultas (sin N+1).
 */
@Injectable()
export class CatalogExportService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async export(): Promise<CatalogExport> {
    const [genreRows, regionRows, languageRows, avRows, seasonRows, episodeRows, trailerRows, castRows] =
      await Promise.all([
        this.db.select().from(genres),
        this.db.select().from(regions),
        this.db.select().from(languages),
        this.db.select().from(audiovisuals),
        this.db.select().from(seasons),
        this.db.select().from(episodes),
        this.db.select().from(trailers),
        this.db
          .select({ audiovisualId: audiovisualCast.audiovisualId, name: castMembers.name })
          .from(audiovisualCast)
          .innerJoin(castMembers, eq(castMembers.id, audiovisualCast.castMemberId)),
      ]);

    const nameById = (rows: { id: number; name: string }[]) =>
      new Map(rows.map((r) => [r.id, r.name]));
    const genreName = nameById(genreRows);
    const regionName = nameById(regionRows);
    const languageName = nameById(languageRows);

    // Capítulos agrupados por temporada, ordenados por número.
    const episodesBySeason = new Map<number, CatalogExportEpisode[]>();
    for (const e of episodeRows) {
      const list = episodesBySeason.get(e.seasonId) ?? [];
      list.push({
        id: e.id,
        number: e.number,
        sizeGb: e.sizeGb,
        durationMin: e.durationMin ?? undefined,
      });
      episodesBySeason.set(e.seasonId, list);
    }

    // Temporadas agrupadas por audiovisual, con sus capítulos, ordenadas por número.
    const seasonsByAv = new Map<number, CatalogExportSeason[]>();
    for (const s of seasonRows) {
      const eps = (episodesBySeason.get(s.id) ?? []).sort((a, b) => a.number - b.number);
      const list = seasonsByAv.get(s.audiovisualId) ?? [];
      list.push({ id: s.id, number: s.number, episodes: eps });
      seasonsByAv.set(s.audiovisualId, list);
    }

    // Trailers (youtubeId) y reparto (nombres) agrupados por audiovisual.
    const trailersByAv = new Map<number, string[]>();
    for (const t of trailerRows) {
      const list = trailersByAv.get(t.audiovisualId) ?? [];
      list.push(t.youtubeId);
      trailersByAv.set(t.audiovisualId, list);
    }
    const castByAv = new Map<number, string[]>();
    for (const c of castRows) {
      const list = castByAv.get(c.audiovisualId) ?? [];
      list.push(c.name);
      castByAv.set(c.audiovisualId, list);
    }

    const items: CatalogExportItem[] = avRows.map((a) => {
      const seasons = seasonsByAv.get(a.id)?.sort((x, y) => x.number - y.number);
      return {
        id: a.id,
        // El código guardado es la fuente de verdad (físico en importaciones, P{id} en
        // altas manuales); cae a derivarlo del id si una fila antigua lo tuviera vacío.
        code: a.code || audiovisualCode(a.type as AudiovisualType, a.id),
        type: a.type,
        name: a.name,
        year: a.year,
        rating: a.rating,
        sizeGb: a.sizeGb,
        durationMin: a.durationMin ?? undefined,
        isPremiere: a.isPremiere,
        genre: (a.genreId != null && genreName.get(a.genreId)) || '',
        region: (a.regionId != null && regionName.get(a.regionId)) || '',
        language: (a.languageId != null && languageName.get(a.languageId)) || '',
        description: a.description ?? '',
        imageUrl: a.sourceImageUrl ?? '',
        cast: castByAv.get(a.id) ?? [],
        trailers: trailersByAv.get(a.id) ?? [],
        seasons: seasons && seasons.length ? seasons : undefined,
      };
    });

    return {
      version: 1,
      genres: genreRows.map((g) => g.name),
      regions: regionRows.map((r) => r.name),
      languages: languageRows.map((l) => l.name),
      items,
    };
  }
}
