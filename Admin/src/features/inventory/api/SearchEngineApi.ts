import type { ScanResult, SearchEngineHealth } from '../types';

/**
 * Cliente del SearchEngine local (servidor Go en :4111). NO pasa por el HttpClient
 * del backend: tiene otra baseURL y no lleva token. El navegador del admin corre en
 * la misma máquina donde está el SearchEngine, así que llega a localhost directamente.
 */
const BASE_URL = (import.meta.env.VITE_SEARCH_ENGINE_URL ?? 'http://localhost:4111').replace(/\/$/, '');

export class SearchEngineApi {
  /** Comprueba si el servidor local está habilitado. Falla rápido (timeout corto). */
  async health(): Promise<SearchEngineHealth> {
    return this.fetchJson<SearchEngineHealth>('/health', 4000);
  }

  /** Devuelve el inventario enriquecido desde la caché del servidor (instantáneo). */
  async scan(): Promise<ScanResult> {
    return this.fetchJson<ScanResult>('/scan', 5 * 60 * 1000);
  }

  /** Fuerza un escaneo nuevo del disco (refresca la caché). Úsalo tras añadir películas. */
  async rescan(): Promise<ScanResult> {
    return this.fetchJson<ScanResult>('/rescan', 5 * 60 * 1000, 'POST');
  }

  private async fetchJson<T>(path: string, timeoutMs: number, method: 'GET' | 'POST' = 'GET'): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`SearchEngine respondió ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const SEARCH_ENGINE_URL = BASE_URL;
