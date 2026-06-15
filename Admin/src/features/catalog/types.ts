import type { AudiovisualDTO, AudiovisualType } from '@daher/domain';

/** Fila del catálogo tal como la devuelve NestJS (DTO + campos derivados). */
export interface AudiovisualRow extends AudiovisualDTO {
  code: string;
  isEpisodic: boolean;
  /** Marca de cambios sin publicar, si el backend la expone. */
  published?: boolean;
  hasUnpublishedChanges?: boolean;
}

/** Datos del formulario de creación/edición. */
export interface AudiovisualInput {
  type: AudiovisualType;
  name: string;
  year: number;
  rating: number;
  sizeGb: number;
  isPremiere: boolean;
}

/** Catálogo auxiliar simple (género, región, idioma, reparto). */
export interface NamedEntity {
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
  durationMin?: number;
}

export interface SeasonInput {
  number: number;
  sizeGb: number;
}

export interface EpisodeInput {
  number: number;
  sizeGb: number;
  durationMin?: number;
}

export interface TrailerRow {
  id: number;
  youtubeId: string;
}

export type AuxKind = 'genres' | 'regions' | 'languages' | 'cast';

/** Respuesta paginada de GET /catalog. */
export interface CatalogListResponse {
  total: number;
  items: AudiovisualRow[];
}

/** Detalle de GET /catalog/:id: audiovisual con sus relaciones anidadas. */
export interface AudiovisualDetail extends AudiovisualRow {
  seasons: SeasonRow[];
  trailers: TrailerRow[];
  cast: NamedEntity[];
}
