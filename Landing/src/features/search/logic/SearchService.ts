// SearchService: implementa el modo loading|local|api (especificaciones §4) con fallback
// a la API NestJS y timeout duro. Recibe sus dependencias por constructor (arquitectura §6.1):
// el modo se carga de forma asíncrona con loadIndex() porque el índice MiniSearch llega por red.
import MiniSearch from 'minisearch';
import { isCode } from '@dahem/domain';
import type { SearchHit, SearchIndexFile, SearchMode } from '../types';

/** normalize NFD: quita acentos en índice y query (especificaciones §4.6). */
const processTerm = (term: string): string =>
  term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export interface SearchServiceDeps {
  indexUrl: string; // /search-index.json
  apiUrl: string; // fallback NestJS
  fetchFn: typeof fetch;
  /** Timeout duro de descarga del índice, 10-15s (especificaciones §4.1). */
  timeoutMs?: number;
  onModeChange?: (mode: SearchMode) => void;
}

export class SearchService {
  private mode: SearchMode = 'loading';
  private index: MiniSearch<SearchHit> | null = null;

  constructor(private readonly deps: SearchServiceDeps) {}

  getMode(): SearchMode {
    return this.mode;
  }

  private setMode(mode: SearchMode): void {
    this.mode = mode;
    this.deps.onModeChange?.(mode);
  }

  /** Carga y construye el índice local. Si falla o expira, queda en modo `api`. */
  async loadIndex(): Promise<void> {
    if (this.index) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.deps.timeoutMs ?? 12000);
    try {
      const res = await this.deps.fetchFn(this.deps.indexUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`index ${res.status}`);
      const data = (await res.json()) as SearchIndexFile;
      const docs: SearchHit[] = data.items.map(([code, title]) => ({ code, title }));
      const mini = new MiniSearch<SearchHit>({
        fields: ['title', 'code'],
        storeFields: ['code', 'title'],
        idField: 'code',
        processTerm,
        searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 2 } },
      });
      mini.addAll(docs);
      this.index = mini;
      this.setMode('local');
    } catch {
      // timeout, 404, parser error → API permanente esta sesión (especificaciones §4.1).
      this.setMode('api');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Busca según el modo. En `local` es síncrono (0ms debounce); en `loading`/`api` va a la API.
   * La búsqueda por código rutea a prefijo exacto (funcional §2.3, búsqueda §2.4).
   */
  async search(query: string, limit = 30): Promise<SearchHit[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    if (this.mode === 'local' && this.index) {
      return this.searchLocal(q, limit);
    }
    return this.searchApi(q, limit);
  }

  private searchLocal(q: string, limit: number): SearchHit[] {
    if (!this.index) return [];
    if (isCode(q)) {
      // Match por prefijo jerárquico sobre el código.
      const upper = q.toUpperCase();
      return this.index
        .search(upper, { prefix: true, fuzzy: false, fields: ['code'] })
        .filter((r) => (r.code as string).toUpperCase().startsWith(upper))
        .slice(0, limit)
        .map((r) => ({ code: r.code as string, title: r.title as string }));
    }
    return this.index
      .search(q)
      .slice(0, limit)
      .map((r) => ({ code: r.code as string, title: r.title as string }));
  }

  /** Fallback contra NestJS: GET {apiUrl}/search?q=... (especificaciones §2.2, §4.1). */
  private async searchApi(q: string, limit: number): Promise<SearchHit[]> {
    if (!this.deps.apiUrl) return [];
    try {
      const url = `${this.deps.apiUrl}/search?q=${encodeURIComponent(q)}&limit=${limit}`;
      const res = await this.deps.fetchFn(url);
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: SearchHit[] } | SearchHit[];
      return Array.isArray(data) ? data : (data.items ?? []);
    } catch {
      return [];
    }
  }
}

export { processTerm };
