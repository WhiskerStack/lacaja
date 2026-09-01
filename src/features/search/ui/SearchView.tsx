// Isla del buscador (funcional §6.4). Input con autocomplete (MiniSearch local o fallback API),
// enlace "Solicítala" entre buscador y resultados, y lista con scroll infinito.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { searchService } from '../../../app/container';
import { $searchMode } from '../store';
import { detailUrl, PLACEHOLDER_IMAGE } from '../../../shared/urls';
import { patchSnapshot, readSnapshot, replaceUrl } from '../../../shared/nav-state';
import { TYPE_LABEL } from '../../catalog/types';
import type { CatalogCardDTO } from '../../catalog/types';
import type { SearchHit } from '../types';

interface Props {
  /** Catálogo completo (cards) para resolver foto/año/género por código. */
  cards: CatalogCardDTO[];
}

const PAGE = 12;

export default function SearchView({ cards }: Props) {
  const mode = useStore($searchMode);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [shown, setShown] = useState(PAGE);
  const [indexReady, setIndexReady] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);
  const sentinel = useRef<HTMLDivElement | null>(null);
  /** Consulta recuperada del historial: solo ella conserva la paginación restaurada. */
  const restoredQuery = useRef('');

  const byCode = useMemo(() => new Map(cards.map((c) => [c.code, c])), [cards]);

  // Al volver atrás desde un detalle: la consulta se recupera de la URL (?q=) y la paginación
  // del snapshot de esta entrada del historial. Entrar por el menú a /buscar arranca vacío.
  useLayoutEffect(() => {
    const q = new URLSearchParams(location.search).get('q') ?? '';
    if (q) {
      restoredQuery.current = q;
      setQuery(q);
    }
    const snap = readSnapshot();
    if (snap.shown && snap.shown > PAGE) setShown(snap.shown);
  }, []);

  useEffect(() => {
    // indexReady vuelve a lanzar la búsqueda: con una consulta restaurada, el primer intento
    // ocurre antes de que el índice MiniSearch esté construido y devolvería cero resultados.
    void searchService.loadIndex().then(() => setIndexReady(true));
  }, []);

  // Debounce diferenciado: 0ms local, 300ms api (especificaciones §4.3).
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const delay = mode === 'local' ? 0 : 300;
    debounceRef.current = window.setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setHits([]);
        return;
      }
      const results = await searchService.search(q, 60);
      setHits(results);
      setShown((s) => (s > PAGE && q === restoredQuery.current ? s : PAGE));
    }, delay);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, mode, indexReady]);

  // La consulta se refleja en la URL sin crear entradas de historial (un clic en un resultado
  // debe volver aquí con un solo "atrás", no con uno por letra tecleada).
  useEffect(() => {
    const q = query.trim();
    const target = q ? `${location.pathname}?q=${encodeURIComponent(q)}` : location.pathname;
    // Idempotente: al restaurar, la URL ya es la correcta y no se reescribe.
    if (target !== location.pathname + location.search) replaceUrl(target);
  }, [query]);

  useEffect(() => {
    patchSnapshot({ shown });
  }, [shown]);

  // Scroll infinito.
  useEffect(() => {
    if (!sentinel.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setShown((s) => Math.min(s + PAGE, hits.length));
    });
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [hits.length]);

  const visible = hits.slice(0, shown);

  return (
    <div class="max-w-3xl mx-auto">
      <div class="form-control mb-2">
        <input
          type="search"
          class="input input-lg input-bordered w-full"
          placeholder="Busca por nombre o código (ej. Dune, S1122)…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          autoFocus
        />
      </div>

      {query.trim().length >= 2 && hits.length === 0 && (
        <p class="opacity-70 text-sm py-6">Sin resultados para “{query.trim()}”.</p>
      )}

      <ul class="space-y-2">
        {visible.map((hit) => {
          const card = byCode.get(hit.code);
          return (
            <li key={hit.code}>
              <a
                href={card ? detailUrl(card) : '#'}
                class="card card-side card-compact bg-base-200 hover:bg-base-300 transition-colors"
              >
                {card && (
                  <figure class="w-16 shrink-0">
                    <img src={card?.imageUrl || PLACEHOLDER_IMAGE} alt="" width="64" height="96" loading="lazy" class="object-cover h-full w-full" />
                  </figure>
                )}
                <div class="card-body">
                  <p class="font-semibold">{hit.title}</p>
                  <p class="text-xs opacity-70">
                    <span class="font-mono">{hit.code}</span>
                    {card && ` · ${TYPE_LABEL[card.type]} · ${card.year}`}
                  </p>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
      <div ref={sentinel} class="h-8" />
    </div>
  );
}
