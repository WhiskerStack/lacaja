import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import {
  CatalogMetadataRepository,
  type EpisodeRow,
  type NamedRow,
  type SeasonRow,
  type TrailerRow,
} from '../domain/CatalogMetadataRepository';
import {
  audiovisualCast,
  castMembers,
  episodes,
  genres,
  languages,
  regions,
  seasons,
  trailers,
} from './catalog.schema';

@Injectable()
export class DrizzleCatalogMetadataRepository extends CatalogMetadataRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  // --- Catálogos simples ---
  listGenres(): Promise<NamedRow[]> {
    return this.db.select().from(genres);
  }
  async createGenre(name: string): Promise<NamedRow> {
    const [row] = await this.db.insert(genres).values({ name }).returning();
    return row;
  }
  async deleteGenre(id: number): Promise<void> {
    await this.db.delete(genres).where(eq(genres.id, id));
  }

  listRegions(): Promise<NamedRow[]> {
    return this.db.select().from(regions);
  }
  async createRegion(name: string): Promise<NamedRow> {
    const [row] = await this.db.insert(regions).values({ name }).returning();
    return row;
  }
  async deleteRegion(id: number): Promise<void> {
    await this.db.delete(regions).where(eq(regions.id, id));
  }

  listLanguages(): Promise<NamedRow[]> {
    return this.db.select().from(languages);
  }
  async createLanguage(name: string): Promise<NamedRow> {
    const [row] = await this.db.insert(languages).values({ name }).returning();
    return row;
  }
  async deleteLanguage(id: number): Promise<void> {
    await this.db.delete(languages).where(eq(languages.id, id));
  }

  // --- Reparto ---
  listCast(): Promise<NamedRow[]> {
    return this.db.select().from(castMembers);
  }
  async createCastMember(name: string): Promise<NamedRow> {
    const [row] = await this.db.insert(castMembers).values({ name }).returning();
    return row;
  }
  async deleteCastMember(id: number): Promise<void> {
    await this.db.delete(castMembers).where(eq(castMembers.id, id));
  }
  async linkCast(audiovisualId: number, castMemberId: number): Promise<void> {
    await this.db
      .insert(audiovisualCast)
      .values({ audiovisualId, castMemberId })
      .onConflictDoNothing();
  }
  castOf(audiovisualId: number): Promise<NamedRow[]> {
    return this.db
      .select({ id: castMembers.id, name: castMembers.name })
      .from(audiovisualCast)
      .innerJoin(castMembers, eq(castMembers.id, audiovisualCast.castMemberId))
      .where(eq(audiovisualCast.audiovisualId, audiovisualId));
  }

  // --- Trailers ---
  trailersOf(audiovisualId: number): Promise<TrailerRow[]> {
    return this.db.select().from(trailers).where(eq(trailers.audiovisualId, audiovisualId));
  }
  async createTrailer(audiovisualId: number, youtubeId: string): Promise<TrailerRow> {
    const [row] = await this.db
      .insert(trailers)
      .values({ audiovisualId, youtubeId })
      .returning();
    return row;
  }
  async deleteTrailer(id: number): Promise<void> {
    await this.db.delete(trailers).where(eq(trailers.id, id));
  }

  // --- Jerarquía episódica ---
  seasonsOf(audiovisualId: number): Promise<SeasonRow[]> {
    return this.db.select().from(seasons).where(eq(seasons.audiovisualId, audiovisualId));
  }
  async createSeason(audiovisualId: number, number: number, sizeGb: number): Promise<SeasonRow> {
    const [row] = await this.db
      .insert(seasons)
      .values({ audiovisualId, number, sizeGb })
      .returning();
    return row;
  }
  async deleteSeason(id: number): Promise<void> {
    await this.db.delete(seasons).where(eq(seasons.id, id));
  }

  async episodesOf(seasonId: number): Promise<EpisodeRow[]> {
    return this.db.select().from(episodes).where(eq(episodes.seasonId, seasonId));
  }
  async createEpisode(
    seasonId: number,
    number: number,
    sizeGb: number,
    durationMin?: number,
  ): Promise<EpisodeRow> {
    const [row] = await this.db
      .insert(episodes)
      .values({ seasonId, number, sizeGb, durationMin: durationMin ?? null })
      .returning();
    return row;
  }
  async deleteEpisode(id: number): Promise<void> {
    await this.db.delete(episodes).where(eq(episodes.id, id));
  }
}
