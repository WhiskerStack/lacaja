import type { AudiovisualType } from '@dahem/domain';

/** Capítulo físico dentro de una temporada (lo produce el SearchEngine). */
export interface ScannedEpisode {
  number: number;
  sizeGb: number;
  durationMin?: number | null;
  path?: string;
}

export interface ScannedSeason {
  number: number;
  sizeGb: number;
  episodes: ScannedEpisode[];
}

/** Audiovisual detectado en el disco y (opcionalmente) enriquecido vía TMDb. */
export interface ScannedItem {
  code: string; // código físico (P1, S2...)
  type: AudiovisualType;
  title: string; // español
  titleEn: string; // original/inglés
  year: number;
  sizeGb: number;
  isPremiere: boolean;
  durationMin?: number | null;
  rating: number;
  description: string;
  posterUrl: string;
  genre: string;
  enriched: boolean;
  seasons?: ScannedSeason[];
  path: string;
}

export interface ScanStats {
  total: number;
  movies: number;
  series: number;
  episodes: number;
  totalSizeGb: number;
}

export interface ScanResult {
  root: string;
  items: ScannedItem[];
  stats: ScanStats;
  warnings?: string[];
  enriched: boolean;
}

/** Respuesta de /health del SearchEngine. */
export interface SearchEngineHealth {
  status: string;
  service: string;
  version: string;
  root: string;
  enrichEnabled: boolean;
}

/** Resultado de la importación masiva en el backend. */
export interface ImportResult {
  created: number;
  skipped: number;
  createdCodes: string[];
  skippedCodes: string[];
}
