// CatalogService de build-time: lee el catálogo sincronizado y produce los DTOs aplanados
// que consumen getStaticPaths y las páginas (arquitectura §5). No hace I/O de red en este módulo:
// el SSG construye standalone desde src/data/catalog.json, que scripts/sync-catalog.mjs genera
// desde el backend (o copia del sample si el backend no está disponible).
import type {
  CatalogCardDTO,
  CatalogItemDTO,
  CatalogMetadata,
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
  /** Arreglo de géneros. `genre` (string) es el formato antiguo, aún tolerado al hidratar. */
  genres?: string[];
  genre?: string;
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
  /**
   * Banderas de los pipelines de datos (scripts/). Se tipan aquí solo para describir
   * el JSON: no se proyectan al DTO porque la vista no las necesita.
   */
  metadata?: CatalogMetadata;
}

const catalog = raw as { items: RawItem[]; genres: string[]; regions: string[]; languages: string[] };

/** Géneros normalizados del item crudo: acepta el arreglo nuevo y el `genre` string antiguo. */
function toGenres(r: RawItem): string[] {
  if (Array.isArray(r.genres) && r.genres.length) return r.genres;
  if (r.genre) return [r.genre];
  return ['Sin género'];
}

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

/**
 * Códigos por nivel (funcional §6.3.1): a partir del código del audiovisual ("S1122"),
 * cada temporada es "S1122-3" y cada capítulo "S1122-3-10". El peso de la temporada es
 * la suma de sus capítulos.
 * Se exporta para poder probar la regla con datos de ejemplo: el catálogo real todavía
 * no trae el desglose por temporada, así que no sirve como fuente para el test.
 */
export function toSeasonDTOs(code: string, rawSeasons: RawSeason[] = []): SeasonViewDTO[] {
  return rawSeasons.map((s) => {
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
}

/** Hidrata un item crudo del JSON al DTO aplanado, calculando códigos y peso total. */
function toItemDTO(r: RawItem): CatalogItemDTO {
  // El código guardado manda; si el sample no lo trae, se deriva del id (mismo formato).
  const code = r.code || r.id;
  let seasons: SeasonViewDTO[] | [] = [];
  let totalSizeGb = r.sizeGb ?? 0;

  if (r.seasons?.length) {
    seasons = toSeasonDTOs(code, r.seasons);
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
    genres: toGenres(r),
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
    genres: i.genres,
    isPremiere: i.isPremiere,
    totalSizeGb: i.totalSizeGb,
  };
}

export function getCards(): CatalogCardDTO[] {
  return ITEMS.map(toCard);
}

/**
 * Parte numérica del código de catálogo: "S101" → 101, "P0023" → 23.
 * Como los códigos se asignan de forma incremental al dar de alta, ordenar por este
 * número de mayor a menor equivale a "lo último agregado primero".
 */
export function codeNumber(code: string): number {
  const n = Number.parseInt(code.replace(/^[A-Za-z]+/, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Comparador descendente por código (últimos agregados primero). */
export function byCodeDesc(a: { code: string }, b: { code: string }): number {
  return codeNumber(b.code) - codeNumber(a.code);
}

/**
 * Nota mínima para entrar en la carátula. El orden de la portada es por año, así que sin
 * este filtro un título flojo del año en curso encabezaría el escaparate.
 */
export const MIN_HIGHLIGHT_RATING = 7;

/**
 * Los N destacados de la carátula de Home (funcional §6.1.1): de los títulos que superan
 * MIN_HIGHLIGHT_RATING, los del año más reciente y, a igualdad de año, los últimos agregados.
 */
export function getPremiereHighlights(limit = 5): CatalogItemDTO[] {
  const wellRated = ITEMS.filter((i) => i.rating >= MIN_HIGHLIGHT_RATING);
  // Si el umbral dejara la carátula corta, se completa con el resto del catálogo.
  const pool = wellRated.length >= limit ? wellRated : ITEMS;
  return [...pool]
    .sort((a, b) => {
      // Estrenos primero; dentro de cada grupo, año descendente y, a igualdad, últimos agregados.
      if (a.isPremiere !== b.isPremiere) return a.isPremiere ? -1 : 1;
      if (b.year !== a.year) return b.year - a.year;
      return byCodeDesc(a, b);
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

/**
 * Sugerencias: comparten al menos un género, mayor rating, excluyendo el propio (funcional §6.2.5).
 * Con géneros múltiples se ordena primero por cuántos comparten, para que un empate de rating
 * no ponga por delante a un título que solo coincide en el género más genérico.
 */
export function getSuggestions(item: CatalogItemDTO, limit = 8): CatalogCardDTO[] {
  const own = new Set(item.genres);
  return getCards()
    .map((c) => ({ card: c, shared: c.genres.filter((g) => own.has(g)).length }))
    .filter((e) => e.card.id !== item.id && e.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.card.rating - a.card.rating)
    .slice(0, limit)
    .map((e) => e.card);
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
