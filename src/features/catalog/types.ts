// DTOs del slice catalog. Extienden el AudiovisualDTO plano de @dahem/domain con los
// metadatos desnormalizados que el landing necesita para mostrar (modelo de datos §5).
import type { AudiovisualDTO, AudiovisualType } from '@/features/common/domain/types';

export type { AudiovisualType };

/**
 * Metadatos de proceso del catálogo: banderas que dicen qué pipelines de datos ya
 * corrieron sobre un ítem (enriquecimiento TMDB, traducción de la sinopsis,
 * enriquecimiento de géneros, revisión de títulos). No describen al audiovisual,
 * así que no viajan en CatalogItemDTO: solo los usan los scripts de scripts/.
 */
export interface CatalogMetadata {
  /** Ya pasó por scripts/enrich-catalog.mjs (TMDB). */
  enriched?: boolean;
  /** Su descripción ya pasó por scripts/translate-descriptions.mjs. */
  translated?: boolean;
  /** Sus géneros ya se enriquecieron desde TMDB. */
  genresEnriched?: boolean;
  /** Sus títulos ya pasaron por scripts/fix-title-languages.mjs. */
  titlesChecked?: boolean;
}

export interface EpisodeViewDTO {
  id: string;
  number: number;
  sizeGb: number;
  durationMin?: number;
  /** Código calculado en build: "S1122-3-10". */
  code: string;
}

export interface SeasonViewDTO {
  id: string;
  number: number;
  sizeGb: number;
  /** Código calculado en build: "S1122-3". */
  code: string;
  episodes: EpisodeViewDTO[];
}

/**
 * Proyección aplanada del catálogo que viaja por SSG (props de página → islas).
 * Es un DTO plano: cruza la frontera de serialización sin métodos (arquitectura §3b.1).
 */
export interface CatalogItemDTO extends AudiovisualDTO {
  /** Código base ya calculado: "P0023" / "S1122". */
  code: string;
  /**
   * Título alternativo del catálogo (campo `enName`): el que no está en `name`.
   * Según el ítem es el original o el conocido en español, así que la UI lo
   * presenta como "También conocido como". Ausente si no aporta nada nuevo.
   */
  altName?: string;
  durationMin?: number;
  description: string;
  imageUrl: string;
  /** Un audiovisual puede pertenecer a varios géneros. Nunca vacío: al menos ['Sin género']. */
  genres: string[];
  region: string;
  language: string;
  cast: string[];
  trailers: string[];
  seasons?: SeasonViewDTO[];
  /** Peso total (suma de temporadas si es episódico; sizeGb si es película). */
  totalSizeGb: number;
  seasonCount: number
  episodeCount: number,
}

/** Ítem ligero para grids/carruseles (foto, nombre, clasificación, año). */
export interface CatalogCardDTO {
  id: string;
  code: string;
  type: AudiovisualType;
  name: string;
  year: number;
  rating: number;
  imageUrl: string;
  genres: string[];
  isPremiere: boolean;
  totalSizeGb: number;
  /** Título alternativo; ver CatalogItemDTO.altName. */
  altName?: string;
}

export const TYPE_LABEL: Record<AudiovisualType, string> = {
  movie: 'Película',
  series: 'Serie',
  telenovela: 'Novela',
  show: 'Show',
  anime: 'Anime',
};

/** Etiqueta plural para chips de Biblioteca (funcional §6.5.2). */
export const TYPE_LABEL_PLURAL: Record<AudiovisualType, string> = {
  movie: 'Películas',
  series: 'Series',
  telenovela: 'Novelas',
  show: 'Shows',
  anime: 'Animes',
};
