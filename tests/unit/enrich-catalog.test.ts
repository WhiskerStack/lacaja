import { describe, it, expect, vi, afterEach } from 'vitest';
// Script de build en JS puro: se importa para probar el emparejamiento sin tocar la red.
import {
  pickBestMatch,
  resultYear,
  searchTMDB,
  enrichItem,
  regionToIso,
  countriesOf,
  countryMatches,
} from '../../scripts/enrich-catalog.mjs';

const movie = (id: number, title: string, date: string, popularity: number) => ({
  id,
  title,
  release_date: date,
  popularity,
  media_type: 'movie',
});
const tv = (id: number, name: string, date: string, popularity: number) => ({
  id,
  name,
  first_air_date: date,
  popularity,
  media_type: 'tv',
});

describe('resultYear', () => {
  it('lee el año de películas y de series', () => {
    expect(resultYear(movie(1, 'Dune', '2021-09-15', 50))).toBe(2021);
    expect(resultYear(tv(2, 'Fallout', '2024-04-10', 50))).toBe(2024);
  });

  it('devuelve null si no hay fecha', () => {
    expect(resultYear({ id: 3, title: 'Sin fecha' })).toBeNull();
  });
});

describe('pickBestMatch', () => {
  it('prefiere el año del catálogo antes que la popularidad', () => {
    const results = [movie(1, 'Dune', '2021-09-15', 500), movie(2, 'Dune', '1984-12-14', 30)];
    expect(pickBestMatch(results, { year: 1984 })?.id).toBe(2);
    expect(pickBestMatch(results, { year: 2021 })?.id).toBe(1);
  });

  it('el año exacto gana aunque el otro candidato sea mucho más popular', () => {
    const results = [movie(1, 'X', '2023-01-01', 10), movie(2, 'X', '2024-01-01', 900)];
    expect(pickBestMatch(results, { year: 2023 })?.id).toBe(1);
  });

  it('sin año exacto, entre candidatos igual de cercanos decide la popularidad', () => {
    const results = [movie(1, 'X', '2022-01-01', 10), movie(2, 'X', '2024-01-01', 90)];
    expect(pickBestMatch(results, { year: 2023 })?.id).toBe(2);
  });

  it('con más de un año de diferencia elige el más cercano, no el más popular', () => {
    const results = [movie(1, 'X', '2010-01-01', 900), movie(2, 'X', '2019-01-01', 5)];
    expect(pickBestMatch(results, { year: 2020 })?.id).toBe(2);
  });

  it('usa first_air_date en series: el año no se pierde por buscar solo release_date', () => {
    const results = [tv(1, 'Shogun', '1980-09-15', 400), tv(2, 'Shogun', '2024-02-27', 80)];
    expect(pickBestMatch(results, { year: 2024 })?.id).toBe(2);
  });

  it('descarta personas de search/multi', () => {
    const results = [
      { id: 1, name: 'Dune Actor', media_type: 'person', popularity: 999 },
      movie(2, 'Dune', '2021-09-15', 10),
    ];
    expect(pickBestMatch(results, { year: 2021 })?.id).toBe(2);
  });

  it('respeta el tipo pedido cuando se indica', () => {
    const results = [movie(1, 'Fallout', '2024-01-01', 900), tv(2, 'Fallout', '2024-04-10', 10)];
    expect(pickBestMatch(results, { year: 2024, mediaType: 'tv' })?.id).toBe(2);
  });

  it('sin año en el catálogo se queda con lo más popular', () => {
    const results = [movie(1, 'X', '2001-01-01', 5), movie(2, 'X', '2015-01-01', 80)];
    expect(pickBestMatch(results, {})?.id).toBe(2);
  });

  it('devuelve null si no hay candidatos válidos', () => {
    expect(pickBestMatch([], { year: 2020 })).toBeNull();
    expect(pickBestMatch([{ id: 1, media_type: 'person' }], { year: 2020 })).toBeNull();
  });
});

describe('regionToIso', () => {
  it('mapea las regiones del dataset a ISO 3166-1', () => {
    expect(regionToIso('EU')).toBe('US'); // "EU" es Estados Unidos en el dataset, no la Unión Europea
    expect(regionToIso('USA')).toBe('US');
    expect(regionToIso(' España ')).toBe('ES');
    expect(regionToIso('Reino Unido')).toBe('GB');
    expect(regionToIso('México')).toBe('MX');
  });

  it('ignora las regiones que no sirven para filtrar', () => {
    expect(regionToIso('Desconocido')).toBeNull();
    expect(regionToIso('2026')).toBeNull(); // años colados por filas mal parseadas del Excel
    expect(regionToIso('')).toBeNull();
    expect(regionToIso(undefined)).toBeNull();
  });
});

describe('countriesOf / countryMatches', () => {
  it('lee production_countries (películas) y origin_country (series) sin duplicar', () => {
    expect(countriesOf({ production_countries: [{ iso_3166_1: 'US' }], origin_country: ['US', 'GB'] })).toEqual(['US', 'GB']);
    expect(countriesOf({})).toEqual([]);
  });

  it('sin país esperado o sin país en TMDB no opina', () => {
    expect(countryMatches({ origin_country: ['GB'] }, null)).toBeNull();
    expect(countryMatches({}, 'US')).toBeNull();
  });

  it('distingue coincidencia de discrepancia', () => {
    expect(countryMatches({ origin_country: ['US'] }, 'US')).toBe(true);
    expect(countryMatches({ origin_country: ['GB'] }, 'US')).toBe(false);
  });
});

describe('pickBestMatch con país', () => {
  it('el país desempata entre candidatos del mismo año, por delante de la popularidad', () => {
    const results = [
      { ...tv(1, 'The Office', '2005-03-24', 900), origin_country: ['GB'] },
      { ...tv(2, 'The Office', '2005-03-24', 10), origin_country: ['US'] },
    ];
    expect(pickBestMatch(results, { year: 2005 })?.id).toBe(1); // sin país: manda la popularidad
    expect(pickBestMatch(results, { year: 2005, expectedIso: 'US' })?.id).toBe(2);
  });

  it('el año sigue mandando sobre el país', () => {
    const results = [
      { ...tv(1, 'X', '2020-01-01', 10), origin_country: ['GB'] },
      { ...tv(2, 'X', '2010-01-01', 10), origin_country: ['US'] },
    ];
    expect(pickBestMatch(results, { year: 2020, expectedIso: 'US' })?.id).toBe(1);
  });

  it('el candidato sin país declarado queda entre el que coincide y el que no', () => {
    const results = [
      { ...tv(1, 'X', '2020-01-01', 10), origin_country: ['GB'] },
      tv(2, 'X', '2020-01-01', 10),
      { ...tv(3, 'X', '2020-01-01', 10), origin_country: ['US'] },
    ];
    expect(pickBestMatch(results, { year: 2020, expectedIso: 'US' })?.id).toBe(3);
    expect(pickBestMatch(results, { year: 2020, expectedIso: 'FR' })?.id).toBe(2);
  });

  it('sin año en el catálogo el país manda sobre la popularidad', () => {
    const results = [
      { ...tv(1, 'X', '2020-01-01', 900), origin_country: ['GB'] },
      { ...tv(2, 'X', '2010-01-01', 5), origin_country: ['US'] },
    ];
    expect(pickBestMatch(results, { expectedIso: 'US' })?.id).toBe(2);
  });
});

describe('searchTMDB', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(responses: Record<string, unknown[]>) {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      const key = Object.keys(responses).find((k) => url.includes(k));
      return { ok: true, json: async () => ({ results: key ? responses[key] : [] }) };
    });
    return urls;
  }

  it('busca películas por primary_release_year, no por el ignorado `year` de search/multi', async () => {
    const urls = stubFetch({ 'search/movie': [movie(1, 'Dune', '1984-12-14', 30)] });
    const results = await searchTMDB('Dune', { year: 1984, type: 'movie' });
    expect(urls[0]).toContain('/search/movie');
    expect(urls[0]).toContain('primary_release_year=1984');
    expect(results[0].id).toBe(1);
  });

  it('busca series por first_air_date_year', async () => {
    const urls = stubFetch({ 'search/tv': [tv(2, 'Shogun', '2024-02-27', 80)] });
    await searchTMDB('Shogun', { year: 2024, type: 'series' });
    expect(urls[0]).toContain('/search/tv');
    expect(urls[0]).toContain('first_air_date_year=2024');
  });

  it('si el año no da resultados, reintenta sin él antes de rendirse', async () => {
    const urls = stubFetch({ 'search/movie?': [] }); // todo vacío salvo multi
    await searchTMDB('Rara', { year: 1999, type: 'movie' });
    expect(urls.some((u) => u.includes('primary_release_year=1999'))).toBe(true);
    expect(urls.some((u) => u.includes('/search/movie') && !u.includes('primary_release_year'))).toBe(true);
    expect(urls.at(-1)).toContain('/search/multi');
  });

  it('etiqueta el media_type según el endpoint usado (search/movie no lo devuelve)', async () => {
    stubFetch({ 'search/movie': [{ id: 7, title: 'X', release_date: '2020-01-01' }] });
    const results = await searchTMDB('X', { year: 2020, type: 'movie' });
    expect(results[0].media_type).toBe('movie');
  });
});

describe('enrichItem', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('enriquece con la versión del año del catálogo, no con la más popular', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('/search/')) {
        // TMDB devuelve primero la de 2021 por popularidad, aunque se filtre por año.
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: 41, title: 'Dune', release_date: '2021-09-15', popularity: 800 },
              { id: 42, title: 'Dune', release_date: '1984-12-14', popularity: 20 },
            ],
          }),
        };
      }
      const id = Number(url.match(/\/movie\/(\d+)/)?.[1]);
      return {
        ok: true,
        json: async () => ({
          poster_path: `/poster-${id}.jpg`,
          overview: `Sinopsis de ${id}`,
          vote_average: 7,
          credits: { cast: [{ name: 'Actor' }] },
          videos: { results: [] },
        }),
      };
    });

    const item = { code: 'P0001', type: 'movie', name: 'Dune', enName: 'Dune', year: 1984 } as Record<string, unknown>;
    const { changed } = await enrichItem(item);
    expect(changed).toBe(true);
    expect(item.imageUrl).toContain('poster-42');
    expect(item.metadata).toMatchObject({ enriched: true });
  });

  it('no reprocesa lo ya enriquecido salvo con force', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    // Ambos ejes cubiertos: `enriched` y `genresEnriched`. Un ítem con solo el primero
    // sí vuelve a TMDB, para completarle los géneros (ver el caso siguiente).
    const item = {
      code: 'P0002', type: 'movie', name: 'X', year: 2000,
      metadata: { enriched: true, genresEnriched: true },
    };
    expect((await enrichItem(item)).changed).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reprocesa lo enriquecido antes de que existieran los géneros, sin pisar el resto', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('/search/')) {
        return { ok: true, json: async () => ({ results: [{ id: 7, title: 'X', release_date: '2000-01-01' }] }) };
      }
      return {
        ok: true,
        json: async () => ({
          poster_path: '/nuevo.jpg',
          overview: 'sinopsis nueva',
          vote_average: 9,
          genres: [{ id: 18 }, { id: 53 }],
          credits: {},
          videos: {},
        }),
      };
    });
    // A propósito en formato antiguo (bandera suelta en la raíz): enrichItem debe
    // absorberla a metadata en vez de volver a enriquecerlo todo.
    const item: Record<string, unknown> = {
      code: 'P0003', type: 'movie', name: 'X', year: 2000, enriched: true,
      genres: ['Acción'], imageUrl: 'original.jpg', description: 'sinopsis original', rating: 5,
    };
    const { changed } = await enrichItem(item);
    expect(changed).toBe(true);
    expect(item.genres).toEqual(['Acción', 'Drama', 'Suspenso']);
    expect(item.metadata).toMatchObject({ enriched: true, genresEnriched: true });
    expect('enriched' in item).toBe(false);
    // Lo ya enriquecido no se toca: solo se completan los géneros.
    expect(item.imageUrl).toBe('original.jpg');
    expect(item.description).toBe('sinopsis original');
    expect(item.rating).toBe(5);
  });

  it('si fallan los detalles del mejor candidato, prueba con el siguiente', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('/search/')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: 51, title: 'X', release_date: '2020-01-01', popularity: 90 },
              { id: 52, title: 'X', release_date: '2020-06-01', popularity: 10 },
            ],
          }),
        };
      }
      if (url.includes('/movie/51')) return { ok: false, status: 404 };
      return {
        ok: true,
        json: async () => ({ poster_path: '/p52.jpg', overview: 'ok', vote_average: 6, credits: { cast: [] }, videos: { results: [] } }),
      };
    });

    const item = { code: 'P0003', type: 'movie', name: 'X', year: 2020 } as Record<string, unknown>;
    await enrichItem(item);
    expect(item.imageUrl).toContain('p52');
  });

  it('con region del catálogo elige el candidato del país correcto, no el más popular', async () => {
    // Mismo título y mismo año: el país solo se ve en los detalles (películas), así que hay que
    // mirar más allá del primer candidato que responda.
    const paises: Record<number, string> = { 61: 'FR', 62: 'ES' };
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('/search/')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: 61, title: 'La cima', release_date: '2022-05-01', popularity: 900 },
              { id: 62, title: 'La cima', release_date: '2022-06-01', popularity: 5 },
            ],
          }),
        };
      }
      const id = Number(url.match(/\/movie\/(\d+)/)?.[1]);
      return {
        ok: true,
        json: async () => ({
          poster_path: `/poster-${id}.jpg`,
          overview: `Sinopsis de ${id}`,
          vote_average: 7,
          production_countries: [{ iso_3166_1: paises[id] }],
          credits: { cast: [] },
          videos: { results: [] },
        }),
      };
    });

    const item = { code: 'P0004', type: 'movie', name: 'La cima', year: 2022, region: 'España' } as Record<string, unknown>;
    await enrichItem(item);
    expect(item.imageUrl).toContain('poster-62');
  });

  it('si ningún candidato es del país esperado se queda con el mejor por año y avisa', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('/search/')) {
        return {
          ok: true,
          json: async () => ({ results: [{ id: 71, title: 'Coproducción', release_date: '2022-01-01', popularity: 50 }] }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          poster_path: '/poster-71.jpg',
          overview: 'ok',
          vote_average: 7,
          production_countries: [{ iso_3166_1: 'FR' }],
          credits: { cast: [] },
          videos: { results: [] },
        }),
      };
    });

    const item = { code: 'P0005', type: 'movie', name: 'Coproducción', year: 2022, region: 'España' } as Record<string, unknown>;
    await enrichItem(item);
    expect(item.imageUrl).toContain('poster-71'); // no se descarta: mejor eso que dejarlo sin ficha
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('con region inservible no pide detalles de más candidatos que antes', async () => {
    let detalles = 0;
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('/search/')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: 81, title: 'X', release_date: '2020-01-01', popularity: 90 },
              { id: 82, title: 'X', release_date: '2020-01-01', popularity: 10 },
            ],
          }),
        };
      }
      detalles++;
      return {
        ok: true,
        json: async () => ({ poster_path: '/p81.jpg', overview: 'ok', vote_average: 6, credits: { cast: [] }, videos: { results: [] } }),
      };
    });

    const item = { code: 'P0006', type: 'movie', name: 'X', year: 2020, region: 'Desconocido' } as Record<string, unknown>;
    await enrichItem(item);
    expect(detalles).toBe(1);
  });
});

