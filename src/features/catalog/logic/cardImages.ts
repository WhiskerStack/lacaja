// Localización de las imágenes que consumen las islas Preact.
//
// Los componentes .astro (PosterCard, DetailHero) ya pasan por astro:assets, así que
// emiten variantes locales en /_astro. Las islas, en cambio, renderizan
// <img src={imageUrl}> en cliente con la URL cruda de TMDB, y eso tiene dos costes:
//
//  1. Offline no se ven nunca. La petición de una imagen cross-origin sin CORS es
//     `no-cors`, y su respuesta es opaca (status 0). Workbox solo guarda respuestas
//     con status 200 cuando la estrategia no declara `cacheWillUpdate`, así que la
//     regla CacheFirst las descarta: no hay nada en caché ni tras haberlas visto.
//  2. Pesan de más. La biblioteca pide ~600 JPEG w500 de TMDB (decenas de MB) cuando
//     el mismo póster ya existe optimizado a 200px y unos 10 KB.
//
// Reutilizamos exactamente los mismos tamaños que ya usan los componentes .astro para
// que astro:assets deduplique el fichero en vez de generar una variante nueva.
import { getImage } from 'astro:assets';
import { PLACEHOLDER_IMAGE } from '../../../shared/urls';

/** Tamaño de PosterCard: sirve para grid de biblioteca y resultados de búsqueda. */
export const POSTER_SIZE = { width: 200, height: 300 } as const;

/** Tamaño de DetailHero: lo reutiliza la carátula del home. */
export const HERO_SIZE = { width: 1200, height: 1800 } as const;

interface ConImagen {
  imageUrl: string;
}

/** Sustituye `imageUrl` por la variante local optimizada del tamaño indicado. */
export async function withLocalImages<T extends ConImagen>(
  rows: readonly T[],
  size: { width: number; height: number },
): Promise<T[]> {
  return Promise.all(
    rows.map(async (row) => {
      const src = row.imageUrl?.trim() || PLACEHOLDER_IMAGE;
      // Solo se optimiza lo remoto: PLACEHOLDER_IMAGE vive en public/ y se sirve tal cual.
      if (!/^https?:\/\//i.test(src)) return { ...row, imageUrl: src };
      const optimizada = await getImage({ src, ...size });
      return { ...row, imageUrl: optimizada.src };
    }),
  );
}
