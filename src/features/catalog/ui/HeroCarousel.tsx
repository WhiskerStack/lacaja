// Carátula full-width de Home (funcional §6.1.1): carrusel de 5 estrenos/mejor votadas con
// nombre, nota, año y descripción truncada. Isla porque rota e interactúa; client:load above-the-fold.
import { useEffect, useState } from 'preact/hooks';
import { detailUrl } from '../../../shared/urls';
import { formatRating, truncate } from '../../../shared/format';
import { TYPE_LABEL } from '../types';
import type { CatalogItemDTO } from '../types';

interface Props {
  items: CatalogItemDTO[];
  intervalMs?: number;
}

export default function HeroCarousel({ items, intervalMs = 6000 }: Props) {
  const [i, setI] = useState(0);
  const n = items.length;

  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % n), intervalMs);
    return () => clearInterval(id);
  }, [n, intervalMs]);

  if (n === 0) return null;
  const item = items[i];

  return (
    <section class="relative w-screen left-1/2 -translate-x-1/2 h-[60vh] min-h-80 overflow-hidden">
      {/* Fondo */}
      <img
        src={item.imageUrl}
        alt=""
        class="absolute inset-0 w-full h-full object-cover"
        width="1200"
        height="800"
        fetchpriority="high"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/70 to-transparent" />

      {/* Texto */}
      <div class="absolute bottom-0 left-0 right-0 p-6 sm:p-10 max-w-content mx-auto">
        <div class="flex items-center gap-2 mb-2 text-sm">
          <span class="badge badge-primary">★ {formatRating(item.rating)}</span>
          <span class="opacity-80">{TYPE_LABEL[item.type]}</span>
          <span class="opacity-80">· {item.year}</span>
          {item.isPremiere && <span class="badge badge-secondary">Estreno</span>}
        </div>
        <h1 class="text-3xl sm:text-5xl font-extrabold drop-shadow mb-2">{item.name}</h1>
        <p class="max-w-2xl opacity-90 line-clamp-2 mb-4">{truncate(item.description, 180)}</p>
        <a href={detailUrl(item)} class="btn btn-primary">Ver detalle</a>
      </div>

      {/* Indicadores */}
      <div class="absolute top-4 right-4 flex gap-1">
        {items.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Ir al slide ${idx + 1}`}
            class={`w-2.5 h-2.5 rounded-full ${idx === i ? 'bg-primary' : 'bg-base-content/40'}`}
            onClick={() => setI(idx)}
          />
        ))}
      </div>
    </section>
  );
}
