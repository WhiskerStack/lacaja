// Tipos del slice search.

import { AudiovisualType } from "../catalog/types";

/** Tres estados de la búsqueda (especificaciones §4.1). */
export type SearchMode = 'loading' | 'local';

/** Resultado normalizado que pinta la UI (foto se resuelve por código contra el catálogo). */
export interface SearchHit {
  code: string;
  title: string;
  year?: number;
  type?: AudiovisualType;
  genres?: string[];
}

/** Forma del search-index.json (tuplas posicionales, especificaciones §4.4). */
export interface SearchIndexFile {
  v: number;
  items: [string, string][]; // [code, title]
}

/** Forma del library-index.json. */
export interface LibraryIndexFile {
  v: number;
  genres: string[];
  regions: string[];
  languages: string[];
  items: [string, string, number, AudiovisualType, number[], number, number][];
  // [code, title, year, type, genreIdxs, regionIdx, languageIdx]
  // genreIdxs es un arreglo: un ítem puede tener varios géneros (formato v2).
}
