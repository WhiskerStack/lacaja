// CatalogService de build-time: lee el catálogo sincronizado y produce los DTOs aplanados
// que consumen getStaticPaths y las páginas (arquitectura §5). No hace I/O de red en este módulo:
// el SSG construye standalone desde src/data/catalog.json, que scripts/sync-catalog.mjs genera
// desde el backend (o copia del sample si el backend no está disponible).
import type {
  CatalogCardDTO,
  CatalogItemDTO,
  SeasonViewDTO,
} from '../types';
import raw from '../../../data/catalog.json';

interface RawEpisode {
  id: string;
  number: number;
  sizeGb: number;
  durationMin?: number;
}
interface RawSeason {
  id: string;
  number: number;
  episodes: RawEpisode[];
}
interface RawItem {
  id: string;
  /** Código del catálogo (P1, S2...). Puede faltar en samples antiguos → se deriva. */
  code?: string;
  type: CatalogItemDTO['type'];
  name: string;
  /** Título alternativo tal cual viene del backend (puede ser el original o el español). */
  enName?: string;
  year: number;
  rating: number;
  sizeGb?: number;
  durationMin?: number;
  isPremiere: boolean;
  genre: string;
  region: string;
  language: string;
  description: string;
  imageUrl: string;
  cast: string[];
  trailers: string[];
  seasons?: RawSeason[];
  seasonCount: number;
  episodeCount: number;
  isActive?: boolean;
}

const catalog = raw as { items: RawItem[]; genres: string[]; regions: string[]; languages: string[] };

/** Clave de comparación de títulos: sin acentos, mayúsculas ni espacios de más. */
function titleKey(title: string): string {
  return title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Devuelve el título alternativo solo si aporta algo distinto al principal. */
function altTitle(name: string, enName?: string): string | undefined {
  const alt = enName?.trim();
  if (!alt || titleKey(alt) === titleKey(name)) return undefined;
  return alt;
}

/** Hidrata un item crudo del JSON al DTO aplanado, calculando códigos y peso total. */
function toItemDTO(r: RawItem): CatalogItemDTO {
  // El código guardado manda; si el sample no lo trae, se deriva del id (mismo formato).
  const code = r.code || r.id;
  let seasons: SeasonViewDTO[] | [] = [];
  let totalSizeGb = r.sizeGb ?? 0;

  if (r.seasons?.length) {
    seasons = r.seasons.map((s) => {
      const seasonCode = `${code}-${s.number}`;
      const episodes = s.episodes.map((e) => ({
        id: e.id,
        number: e.number,
        sizeGb: e.sizeGb,
        durationMin: e.durationMin,
        code: `${seasonCode}-${e.number}`,
      }));
      const seasonSize = episodes.reduce((sum, e) => sum + e.sizeGb, 0);
      return { id: s.id, number: s.number, sizeGb: seasonSize, code: seasonCode, episodes };
    });
    totalSizeGb = seasons.reduce((sum, s) => sum + s.sizeGb, 0);
  }

  return {
    id: r.id,
    type: r.type,
    name: r.name,
    altName: altTitle(r.name, r.enName),
    year: r.year,
    rating: r.rating,
    sizeGb: r.sizeGb ?? 0,
    isPremiere: r.isPremiere,
    code,
    durationMin: r.durationMin,
    description: r.description,
    imageUrl: r.imageUrl,
    genre: r.genre,
    region: r.region,
    language: r.language,
    cast: r.cast ?? [],
    trailers: r.trailers ?? [],
    seasons,
    totalSizeGb: Math.round(totalSizeGb * 100) / 100,
    seasonCount: r.seasonCount,
    episodeCount: r.episodeCount,
  };
}

const activeItems = catalog.items.filter(item => item.isActive !== false);

const ITEMS: CatalogItemDTO[] = activeItems.map(toItemDTO);
const BY_ID = new Map<string, CatalogItemDTO>(ITEMS.map((i) => [i.id, i]));

/** Todos los items del catálogo como DTOs aplanados. */
export function getCatalogIndex(): CatalogItemDTO[] {
  return ITEMS;
}

export function getById(id: string): CatalogItemDTO | undefined {
  return BY_ID.get(id);
}

export function getMovies(): CatalogItemDTO[] {
  return ITEMS.filter((i) => i.type === 'movie');
}

export function getEpisodic(): CatalogItemDTO[] {
  return ITEMS.filter((i) => i.type !== 'movie');
}

export function toCard(i: CatalogItemDTO): CatalogCardDTO {
  return {
    id: i.id,
    code: i.code,
    type: i.type,
    name: i.name,
    altName: i.altName,
    year: i.year,
    rating: i.rating,
    imageUrl: i.imageUrl,
    genre: i.genre,
    isPremiere: i.isPremiere,
    totalSizeGb: i.totalSizeGb,
  };
}

export function getCards(): CatalogCardDTO[] {
  return ITEMS.map(toCard);
}

/** Los N estrenos más recientes (carátula de Home, funcional §6.1.1). */
export function getPremiereHighlights(limit = 5): CatalogItemDTO[] {
  return [...ITEMS]
    .sort((a, b) => {
      // Estrenos primero, luego por rating y año.
      if (a.isPremiere !== b.isPremiere) return a.isPremiere ? -1 : 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.year - a.year;
    })
    .slice(0, limit);
}

/** Items ordenados por rating descendente (mejor votadas). */
export function getTopRated(limit?: number): CatalogCardDTO[] {
  const cards = getCards().sort((a, b) => b.rating - a.rating);
  return limit ? cards.slice(0, limit) : cards;
}

/** Estrenos como tarjetas. */
export function getPremieres(): CatalogCardDTO[] {
  return getCards().filter((c) => c.isPremiere);
}

/** Sugerencias: mismo género, mayor rating, excluyendo el propio (funcional §6.2.5). */
export function getSuggestions(item: CatalogItemDTO, limit = 8): CatalogCardDTO[] {
  return getCards()
    .filter((c) => c.id !== item.id && c.genre === item.genre)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

/** Catálogos de filtros para Biblioteca (funcional §6.5.2). */
export function getFilterFacets() {
  return {
    genres: catalog.genres,
    regions: catalog.regions,
    languages: catalog.languages,
    years: [...new Set(ITEMS.map((i) => i.year))].sort((a, b) => b - a),
  };
}
