// DTOs del slice catalog. Extienden el AudiovisualDTO plano de @dahem/domain con los
// metadatos desnormalizados que el landing necesita para mostrar (modelo de datos §5).
import type { AudiovisualDTO, AudiovisualType } from '@/features/common/domain/types';

export type { AudiovisualType };

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
