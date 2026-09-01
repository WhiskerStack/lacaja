// Isla del buscador (funcional §6.4). Input con autocomplete (MiniSearch local o fallback API),
// enlace "Solicítala" entre buscador y resultados, y lista con scroll infinito.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { searchService } from '../../../app/container';
import { $searchMode } from '../store';
import { detailUrl, PLACEHOLDER_IMAGE } from '../../../shared/urls';
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
  const debounceRef = useRef<number | undefined>(undefined);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const byCode = useMemo(() => new Map(cards.map((c) => [c.code, c])), [cards]);

  useEffect(() => {
    void searchService.loadIndex();
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
      setShown(PAGE);
    }, delay);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, mode]);

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
                  {hit.alt && <p class="text-sm opacity-70">{hit.alt}</p>}
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
