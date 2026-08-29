// Traducción de códigos a paths jerárquicos navegables (especificaciones §9.2).
import type { CatalogCardDTO } from '../features/catalog/types';

/** URL del detalle de un audiovisual completo (película o episódico, vista global). */
export function detailUrl(card: { type: string; id: number }): string {
  return card.type === 'movie' ? `/p/${card.id}` : `/s/${card.id}`;
}

export function seasonUrl(id: string, season: number): string {
  return `/s/${id}/${season}`;
}

export function episodeUrl(id: string, season: number, episode: number): string {
  return `/s/${id}/${season}/${episode}`;
}

export type CardLike = Pick<CatalogCardDTO, 'type' | 'id'>;
