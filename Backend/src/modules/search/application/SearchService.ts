import { isCode } from '@daher/domain';
import { Injectable } from '@nestjs/common';
import {
  SearchProvider,
  SearchResult,
} from '../../catalog/domain/SearchProvider';

export type SearchRouting = 'code' | 'lexical' | 'empty';

/**
 * Orquesta la búsqueda sobre el SearchProvider (inyectado por su puerto, no el adapter).
 * Expone el ruteo (código vs léxico) de forma testeable sin tocar la BD.
 */
@Injectable()
export class SearchService {
  constructor(private readonly provider: SearchProvider) {}

  /** Decide la estrategia: vacío, código (exacto/prefijo) o léxico (FTS+trgm). Búsqueda §2.4. */
  route(query: string): SearchRouting {
    const q = query.trim();
    if (!q) return 'empty';
    return isCode(q) ? 'code' : 'lexical';
  }

  async search(query: string, limit?: number): Promise<SearchResult[]> {
    if (this.route(query) === 'empty') return [];
    return this.provider.search(query, { limit });
  }

  async suggest(query: string, limit?: number): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    return this.provider.suggest(query, { limit });
  }
}
