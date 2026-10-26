// Traducción de códigos a paths jerárquicos navegables (especificaciones §9.2).
import type { CatalogCardDTO } from '../features/catalog/types';

// Prefijo de despliegue (`base` de astro.config.mjs): en GitHub Pages el sitio vive en /lacaja/.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Antepone el `base` del sitio a una ruta absoluta interna ("/buscar" → "/lacaja/buscar"). */
export function withBase(path: string): string {
  return `${BASE}${path}`;
}

/** Inverso de withBase: ruta relativa a la raíz del sitio, para comparar con los enlaces. */
export function stripBase(pathname: string): string {
  if (!BASE || (pathname !== BASE && !pathname.startsWith(`${BASE}/`))) return pathname;
  return pathname.slice(BASE.length) || '/';
}

/** URL del detalle de un audiovisual completo (película o episódico, vista global). */
export function detailUrl(card: CatalogCardDTO): string {
  return card.type === 'movie' ? withBase(`/p/${card.id}`) : withBase(`/s/${card.id}`);
}

export function seasonUrl(id: string, season: number): string {
  return withBase(`/s/${id}/${season}`);
}

export function episodeUrl(id: string, season: number, episode: number): string {
  return withBase(`/s/${id}/${season}/${episode}`);
}

export type CardLike = Pick<CatalogCardDTO, 'type' | 'id'>;

export const PLACEHOLDER_IMAGE = withBase("/image-not-found.png")