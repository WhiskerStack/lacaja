import type { HttpClient } from '@/app/http';
import type {
  AudiovisualRow,
  AudiovisualDetail,
  AudiovisualInput,
  AuxKind,
  CatalogListResponse,
  EpisodeInput,
  EpisodeRow,
  NamedEntity,
  SeasonInput,
  SeasonRow,
  TrailerRow,
} from '../types';

/**
 * Llamadas HTTP del catálogo a NestJS. Solo I/O; devuelve DTOs planos.
 *
 * Nota sobre lectura vs escritura: la ESCRITURA va al controlador admin
 * (`/admin/catalog`, protegido), pero la LECTURA usa el controlador público de
 * catálogo (`/catalog`), que es el único que expone GET (lista paginada y
 * detalle con relaciones anidadas). El backend admin no tiene endpoints GET.
 */
export class CatalogApi {
  constructor(private readonly http: HttpClient) {}

  // --- Audiovisuales (lectura: /catalog público) ---
  /** Lista paginada; pageSize alto para traer todo el catálogo al panel. */
  list(): Promise<CatalogListResponse> {
    return this.http.get<CatalogListResponse>('/catalog?page=1&pageSize=500');
  }

  /** Detalle con seasons[], trailers[], cast[] anidados. */
  getDetail(id: number): Promise<AudiovisualDetail> {
    return this.http.get<AudiovisualDetail>(`/catalog/${id}`);
  }

  create(input: AudiovisualInput): Promise<AudiovisualRow> {
    return this.http.post<AudiovisualRow>('/admin/catalog', input);
  }

  update(id: number, input: AudiovisualInput): Promise<AudiovisualRow> {
    return this.http.put<AudiovisualRow>(`/admin/catalog/${id}`, input);
  }

  remove(id: number): Promise<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`/admin/catalog/${id}`);
  }

  // --- Catálogos auxiliares (genres | regions | languages | cast) ---
  listAux(kind: AuxKind): Promise<NamedEntity[]> {
    return this.http.get<NamedEntity[]>(`/admin/catalog/${kind}`);
  }

  createAux(kind: AuxKind, name: string): Promise<NamedEntity> {
    return this.http.post<NamedEntity>(`/admin/catalog/${kind}`, { name });
  }

  removeAux(kind: AuxKind, id: number): Promise<unknown> {
    return this.http.delete(`/admin/catalog/${kind}/${id}`);
  }

  // --- Reparto enlazado a un audiovisual ---
  linkCast(audiovisualId: number, castMemberId: number): Promise<unknown> {
    return this.http.post(`/admin/catalog/${audiovisualId}/cast`, { castMemberId });
  }

  // --- Temporadas (escritura admin; la lectura sale del detalle público) ---
  createSeason(audiovisualId: number, input: SeasonInput): Promise<SeasonRow> {
    return this.http.post<SeasonRow>(`/admin/catalog/${audiovisualId}/seasons`, input);
  }

  removeSeason(seasonId: number): Promise<unknown> {
    return this.http.delete(`/admin/catalog/seasons/${seasonId}`);
  }

  // --- Capítulos (solo escritura: el backend no expone GET de capítulos) ---
  createEpisode(seasonId: number, input: EpisodeInput): Promise<EpisodeRow> {
    return this.http.post<EpisodeRow>(`/admin/catalog/seasons/${seasonId}/episodes`, input);
  }

  removeEpisode(episodeId: number): Promise<unknown> {
    return this.http.delete(`/admin/catalog/episodes/${episodeId}`);
  }

  // --- Trailers (escritura admin; la lectura sale del detalle público) ---
  createTrailer(audiovisualId: number, youtubeId: string): Promise<TrailerRow> {
    return this.http.post<TrailerRow>(`/admin/catalog/${audiovisualId}/trailers`, { youtubeId });
  }

  removeTrailer(trailerId: number): Promise<unknown> {
    return this.http.delete(`/admin/catalog/trailers/${trailerId}`);
  }
}
