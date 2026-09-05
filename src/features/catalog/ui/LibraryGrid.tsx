// Isla de Biblioteca (funcional §6.5): chips de tipo, panel de filtros (año/género/región/idioma),
// ordenar por, grid de 3 columnas con scroll infinito. Los controles van en una barra pegajosa
// bajo el navbar. Recibe el catálogo completo por props (SSG).
//
// Los filtros viven en la URL (replaceState) y la paginación en el snapshot de la entrada del
// historial, para que "atrás" desde un detalle devuelva la misma vista y el mismo scroll, mientras
// que entrar por el menú a /biblioteca (URL limpia) empieza de cero.
import { useMemo, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { detailUrl } from '../../../shared/urls';
import { formatRating } from '../../../shared/format';
import { patchSnapshot, readSnapshot, replaceUrl } from '../../../shared/nav-state';
import { TYPE_LABEL_PLURAL } from '../types';
import type { AudiovisualType, CatalogCardDTO } from '../types';

interface Facets {
  genres: string[];
  regions: string[];
  languages: string[];
  years: number[];
}
interface Props {
  cards: CatalogCardDTO[];
  facets: Facets;
}

type SortKey = 'rating' | 'year' | 'name';
const PAGE = 12;
const TYPES: AudiovisualType[] = ['movie', 'series', 'anime', 'telenovela', 'show'];

interface Filters {
  type: AudiovisualType | 'all';
  genre: string;
  region: string;
  language: string;
  year: string;
  sort: SortKey;
}
const DEFAULTS: Filters = {
  type: 'all',
  genre: '',
  region: '',
  language: '',
  year: '',
  sort: 'rating',
};

/** Nombre de cada filtro en la query string (URLs legibles y compartibles). */
const PARAM: Record<keyof Filters, string> = {
  type: 'tipo',
  genre: 'genero',
  region: 'region',
  language: 'idioma',
  year: 'anio',
  sort: 'orden',
};

function filtersFromUrl(search: string): Filters {
  const p = new URLSearchParams(search);
  const type = p.get(PARAM.type) as AudiovisualType | 'all' | null;
  const sort = p.get(PARAM.sort) as SortKey | null;
  return {
    type: type && (type === 'all' || TYPES.includes(type)) ? type : DEFAULTS.type,
    genre: p.get(PARAM.genre) ?? DEFAULTS.genre,
    region: p.get(PARAM.region) ?? DEFAULTS.region,
    language: p.get(PARAM.language) ?? DEFAULTS.language,
    year: p.get(PARAM.year) ?? DEFAULTS.year,
    sort: sort && ['rating', 'year', 'name'].includes(sort) ? sort : DEFAULTS.sort,
  };
}

function urlFromFilters(f: Filters): string {
  const p = new URLSearchParams();
  (Object.keys(PARAM) as (keyof Filters)[]).forEach((k) => {
    if (f[k] !== DEFAULTS[k]) p.set(PARAM[k], String(f[k]));
  });
  const qs = p.toString();
  return qs ? `${location.pathname}?${qs}` : location.pathname;
}

export default function LibraryGrid({ cards, facets }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [showFilters, setShowFilters] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const { type, genre, region, language, year, sort } = filters;

  // Restauración al volver atrás. En hidratación no se puede leer la URL (el HTML viene del SSG),
  // así que se aplica en un layout effect: se pinta ya con el estado correcto, sin parpadeo.
  useLayoutEffect(() => {
    setFilters(filtersFromUrl(location.search));
    const snap = readSnapshot();
    if (snap.shown && snap.shown > PAGE) setShown(snap.shown);
    if (snap.filtersOpen) setShowFilters(true);
  }, []);

  // El idioma/región no están en CatalogCardDTO; se filtran por género/tipo/año/orden aquí.
  // (library-index.json lleva esos ejes para una versión cliente más completa.)
  const filtered = useMemo(() => {
    let out = cards.filter((c) => {
      if (type !== 'all' && c.type !== type) return false;
      if (genre && !c.genres.includes(genre)) return false;
      if (year && String(c.year) !== year) return false;
      return true;
    });
    out = out.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'year') return b.year - a.year;
      return a.name.localeCompare(b.name, 'es');
    });
    return out;
  }, [cards, type, genre, year, sort]);

  useEffect(() => {
    patchSnapshot({ shown, filtersOpen: showFilters });
  }, [shown, showFilters]);

  useEffect(() => {
    if (!sentinel.current) return;
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setShown((s) => Math.min(s + PAGE, filtered.length));
    });
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [filtered.length]);

  /** Cambia filtros: reinicia la paginación y refleja el estado en la URL sin tocar el historial. */
  function patch(p: Partial<Filters>) {
    const next = { ...filters, ...p };
    setFilters(next);
    setShown(PAGE);
    replaceUrl(urlFromFilters(next));
  }

  function reset() {
    patch({ genre: '', region: '', language: '', year: '' });
  }

  const visible = filtered.slice(0, shown);

  return (
    <div>
      {/* Barra de controles fija (funcional §6.5.2): al bajar el scroll queda pegada
          justo debajo del navbar, para cambiar de sección/filtro sin volver arriba.
          Fondo opaco (sin blur) para que el grid no se transparente por debajo;
          el desplazamiento negativo compensa el padding horizontal de <main>. */}
      <div
        class="sticky z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-3 mb-4 bg-base-100 border-b border-base-300"
        style="top: var(--navbar-h, 4rem)"
      >
        {/* Chips rápidos (funcional §6.5.2) */}
        <div class="flex gap-2 overflow-x-auto pb-3">
          <button type="button" class={`btn btn-sm ${type === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patch({ type: 'all' })}>
            Todos
          </button>
          {TYPES.map((t) => (
            <button key={t} type="button" class={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patch({ type: t })}>
              {TYPE_LABEL_PLURAL[t]}
            </button>
          ))}
        </div>

        <div class="flex flex-wrap gap-2 pb-3 items-center">
          <button type="button" class="btn btn-sm btn-outline" onClick={() => setShowFilters((s) => !s)}>
            {showFilters ? 'Ocultar filtros' : 'Filtrar'}
          </button>
          <select class="select select-sm select-bordered" value={sort} onChange={(e) => patch({ sort: (e.target as HTMLSelectElement).value as SortKey })}>
            <option value="rating">Ordenar: mejor votadas</option>
            <option value="year">Ordenar: más recientes</option>
            <option value="name">Ordenar: nombre (A-Z)</option>
          </select>
          <span class="text-sm opacity-60 ml-auto">{filtered.length} resultados</span>
        </div>

        {showFilters && (
          <div class="card bg-base-200 p-4 mb-3 grid sm:grid-cols-4 gap-3">
            <select class="select select-sm select-bordered" value={year} onChange={(e) => patch({ year: (e.target as HTMLSelectElement).value })}>
              <option value="">Año (todos)</option>
              {facets.years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select class="select select-sm select-bordered" value={genre} onChange={(e) => patch({ genre: (e.target as HTMLSelectElement).value })}>
              <option value="">Género (todos)</option>
              {facets.genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select class="select select-sm select-bordered" value={region} onChange={(e) => patch({ region: (e.target as HTMLSelectElement).value })}>
              <option value="">Región (todas)</option>
              {facets.regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select class="select select-sm select-bordered" value={language} onChange={(e) => patch({ language: (e.target as HTMLSelectElement).value })}>
              <option value="">Idioma (todos)</option>
              {facets.languages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <div class="sm:col-span-4 flex gap-2">
              <button type="button" class="btn btn-sm btn-primary" onClick={() => setShowFilters(false)}>Aplicar</button>
              <button type="button" class="btn btn-sm btn-ghost" onClick={reset}>Resetear</button>
            </div>
          </div>
        )}
      </div>

      <div class="grid grid-cols-3 gap-2 sm:gap-4">
        {visible.map((c) => (
          <a key={c.code} href={detailUrl(c)} class="group">
            <div class="aspect-[2/3] rounded-box overflow-hidden bg-base-300 relative">
              <img src={c.imageUrl} alt={c.name} loading="lazy" width="200" height="300" class="object-cover w-full h-full group-hover:scale-105 transition-transform" />
              <span class="absolute top-1 right-1 badge badge-sm badge-neutral">★ {formatRating(c.rating)}</span>
              {c.isPremiere && <span class="absolute top-1 left-1 badge badge-sm badge-secondary">Estreno</span>}
            </div>
            <p class="text-sm mt-1 truncate">{c.name}</p>
            <p class="text-xs opacity-60">{c.year}</p>
          </a>
        ))}
      </div>
      <div ref={sentinel} class="h-8" />
    </div>
  );
}
