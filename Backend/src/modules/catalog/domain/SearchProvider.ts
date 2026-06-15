/**
 * Aísla la búsqueda detrás de una interfaz desde el día uno (búsqueda §4.2), para poder
 * cambiar Postgres FTS+trgm por Meilisearch sin tocar el resto del backend.
 * Clase abstracta (no interface) por la misma razón que los puertos: token de DI en Nest.
 */
export interface SearchResult {
  id: number;
  code: string;
  name: string;
  type: string;
  year: number;
  score?: number;
}

export interface SearchOptions {
  limit?: number;
}

export abstract class SearchProvider {
  /** Búsqueda completa: rutea código → match exacto/prefijo; si no, léxica FTS+trgm. */
  abstract search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  /** Sugerencias as-you-type: sólo título, prefijo + trigrama, pocos resultados. */
  abstract suggest(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
}
