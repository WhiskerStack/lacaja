import { Audiovisual } from '@daher/domain';
import type { CatalogApi } from '../api/CatalogApi';
import { validateAudiovisualInput } from '../domain/validation';
import type {
  AudiovisualDetail,
  AudiovisualInput,
  AudiovisualRow,
  AuxKind,
  EpisodeInput,
  EpisodeRow,
  NamedEntity,
  SeasonInput,
  SeasonRow,
  TrailerRow,
} from '../types';

/** Orquesta dominio + api del catálogo. Valida vía el dominio antes de escribir. */
export class CatalogService {
  constructor(private readonly catalogApi: CatalogApi) {}

  async list(): Promise<AudiovisualRow[]> {
    const res = await this.catalogApi.list();
    return res.items;
  }

  getDetail(id: number): Promise<AudiovisualDetail> {
    return this.catalogApi.getDetail(id);
  }

  /** Hidrata una fila a entidad de dominio (para mostrar código, etc.). */
  toEntity(row: AudiovisualRow): Audiovisual {
    return Audiovisual.fromJSON(row);
  }

  async create(input: AudiovisualInput): Promise<AudiovisualRow> {
    this.assertValid(input);
    return this.catalogApi.create(this.normalize(input));
  }

  async update(id: number, input: AudiovisualInput): Promise<AudiovisualRow> {
    this.assertValid(input);
    return this.catalogApi.update(id, this.normalize(input));
  }

  async remove(id: number): Promise<void> {
    await this.catalogApi.remove(id);
  }

  // --- Auxiliares ---
  listAux(kind: AuxKind): Promise<NamedEntity[]> {
    return this.catalogApi.listAux(kind);
  }

  async createAux(kind: AuxKind, name: string): Promise<NamedEntity> {
    if (!name.trim()) throw new Error('El nombre es obligatorio.');
    return this.catalogApi.createAux(kind, name.trim());
  }

  async removeAux(kind: AuxKind, id: number): Promise<void> {
    await this.catalogApi.removeAux(kind, id);
  }

  linkCast(audiovisualId: number, castMemberId: number): Promise<unknown> {
    return this.catalogApi.linkCast(audiovisualId, castMemberId);
  }

  // --- Temporadas (lectura desde el detalle público) ---
  async listSeasons(audiovisualId: number): Promise<SeasonRow[]> {
    const detail = await this.catalogApi.getDetail(audiovisualId);
    return detail.seasons ?? [];
  }

  async createSeason(audiovisualId: number, input: SeasonInput): Promise<SeasonRow> {
    if (input.number <= 0) throw new Error('El número de temporada debe ser positivo.');
    return this.catalogApi.createSeason(audiovisualId, input);
  }

  async removeSeason(seasonId: number): Promise<void> {
    await this.catalogApi.removeSeason(seasonId);
  }

  // --- Capítulos ---
  // El backend no expone GET de capítulos; solo se pueden crear/eliminar.
  async createEpisode(seasonId: number, input: EpisodeInput): Promise<EpisodeRow> {
    if (input.number <= 0) throw new Error('El número de capítulo debe ser positivo.');
    if (input.sizeGb <= 0) throw new Error('El capítulo necesita peso en GB.');
    return this.catalogApi.createEpisode(seasonId, input);
  }

  async removeEpisode(episodeId: number): Promise<void> {
    await this.catalogApi.removeEpisode(episodeId);
  }

  // --- Trailers (lectura desde el detalle público) ---
  async listTrailers(audiovisualId: number): Promise<TrailerRow[]> {
    const detail = await this.catalogApi.getDetail(audiovisualId);
    return detail.trailers ?? [];
  }

  async createTrailer(audiovisualId: number, youtubeId: string): Promise<TrailerRow> {
    const clean = extractYoutubeId(youtubeId);
    if (!clean) throw new Error('Enlace de YouTube inválido.');
    return this.catalogApi.createTrailer(audiovisualId, clean);
  }

  async removeTrailer(trailerId: number): Promise<void> {
    await this.catalogApi.removeTrailer(trailerId);
  }

  // --- Internos ---
  private assertValid(input: AudiovisualInput): void {
    const errors = validateAudiovisualInput(input);
    if (errors.length) throw new Error(errors.join(' '));
  }

  /** Las películas conservan peso; los episódicos lo derivan de sus temporadas. */
  private normalize(input: AudiovisualInput): AudiovisualInput {
    const isEpisodic = input.type !== 'movie';
    return { ...input, sizeGb: isEpisodic ? 0 : input.sizeGb };
  }
}

/** Acepta un id de YouTube directo o una URL y devuelve el id (o null). */
export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
