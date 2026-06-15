// Puertos de los metadatos del catálogo (catálogos de filtrado y jerarquía episódica).
// Tipos planos: son datos de configuración/estructura, no agregados con reglas propias.

export interface NamedRow {
  id: number;
  name: string;
}

export interface SeasonRow {
  id: number;
  audiovisualId: number;
  number: number;
  sizeGb: number;
}

export interface EpisodeRow {
  id: number;
  seasonId: number;
  number: number;
  sizeGb: number;
  durationMin?: number | null;
}

export interface TrailerRow {
  id: number;
  audiovisualId: number;
  youtubeId: string;
}

/**
 * Puerto para administrar los metadatos del catálogo: catálogos de filtrado
 * (género/región/idioma), reparto, trailers y la jerarquía episódica (temporadas/capítulos).
 */
export abstract class CatalogMetadataRepository {
  // Catálogos simples (genre/region/language).
  abstract listGenres(): Promise<NamedRow[]>;
  abstract createGenre(name: string): Promise<NamedRow>;
  abstract deleteGenre(id: number): Promise<void>;

  abstract listRegions(): Promise<NamedRow[]>;
  abstract createRegion(name: string): Promise<NamedRow>;
  abstract deleteRegion(id: number): Promise<void>;

  abstract listLanguages(): Promise<NamedRow[]>;
  abstract createLanguage(name: string): Promise<NamedRow>;
  abstract deleteLanguage(id: number): Promise<void>;

  // Reparto (N:M).
  abstract listCast(): Promise<NamedRow[]>;
  abstract createCastMember(name: string): Promise<NamedRow>;
  abstract deleteCastMember(id: number): Promise<void>;
  abstract linkCast(audiovisualId: number, castMemberId: number): Promise<void>;
  abstract castOf(audiovisualId: number): Promise<NamedRow[]>;

  // Trailers.
  abstract trailersOf(audiovisualId: number): Promise<TrailerRow[]>;
  abstract createTrailer(audiovisualId: number, youtubeId: string): Promise<TrailerRow>;
  abstract deleteTrailer(id: number): Promise<void>;

  // Jerarquía episódica.
  abstract seasonsOf(audiovisualId: number): Promise<SeasonRow[]>;
  abstract createSeason(audiovisualId: number, number: number, sizeGb: number): Promise<SeasonRow>;
  abstract deleteSeason(id: number): Promise<void>;

  abstract episodesOf(seasonId: number): Promise<EpisodeRow[]>;
  abstract createEpisode(
    seasonId: number,
    number: number,
    sizeGb: number,
    durationMin?: number,
  ): Promise<EpisodeRow>;
  abstract deleteEpisode(id: number): Promise<void>;
}
