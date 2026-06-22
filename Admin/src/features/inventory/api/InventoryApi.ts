import type { HttpClient } from '@/app/http';
import type { ImportResult, ScannedItem } from '../types';

/** Payload de un ítem para el endpoint de importación del backend. */
interface ImportItemPayload {
  code: string;
  type: string;
  name: string;
  year: number;
  rating?: number;
  sizeGb?: number;
  isPremiere?: boolean;
  durationMin?: number | null;
  description?: string;
  posterUrl?: string;
  genre?: string;
  seasons?: { number: number; sizeGb?: number; episodes?: { number: number; sizeGb?: number; durationMin?: number | null }[] }[];
}

/** Llamadas al backend NestJS para la importación masiva del catálogo. */
export class InventoryApi {
  constructor(private readonly http: HttpClient) {}

  import(items: ScannedItem[]): Promise<ImportResult> {
    const payload: ImportItemPayload[] = items.map((it) => ({
      code: it.code,
      type: it.type,
      // El nombre mostrado es el título en español; cae al original si falta.
      name: it.title || it.titleEn,
      year: it.year,
      rating: it.rating,
      sizeGb: it.sizeGb,
      isPremiere: it.isPremiere,
      durationMin: it.durationMin ?? undefined,
      description: it.description || undefined,
      posterUrl: it.posterUrl || undefined,
      genre: it.genre || undefined,
      seasons: it.seasons?.map((s) => ({
        number: s.number,
        sizeGb: s.sizeGb,
        episodes: s.episodes?.map((e) => ({
          number: e.number,
          sizeGb: e.sizeGb,
          durationMin: e.durationMin ?? undefined,
        })),
      })),
    }));
    return this.http.post<ImportResult>('/admin/catalog/import', { items: payload });
  }
}
