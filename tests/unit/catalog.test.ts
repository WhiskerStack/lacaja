// Tests de la generación de códigos por nivel y totales de lista vía @dahem/domain.
import { describe, it, expect } from 'vitest';
import {
  getCatalogIndex,
  getById,
  getEpisodic,
  getMovies,
  toSeasonDTOs,
} from '../../src/features/catalog/logic/buildData';
import { priceFor } from '../../src/features/catalog/logic/pricing';
import { DEFAULT_RATE } from '@/domains/PriceRate';
import { Audiovisual } from '@/features/audiovisual/domain/Audiovisual';
import { List } from '@/features/my-list/domain/List';
import { ListItem } from '@/domains/ListItem';

describe('códigos por nivel (funcional §6.3.1)', () => {
  it('genera S1122 / S1122-3 / S1122-3-10 encadenando el código del audiovisual', () => {
    const seasons = toSeasonDTOs('S1122', [
      {
        id: 's-3',
        number: 3,
        episodes: [
          { id: 'e-9', number: 9, sizeGb: 1.5 },
          { id: 'e-10', number: 10, sizeGb: 2 },
        ],
      },
    ]);
    const s3 = seasons.find((s) => s.number === 3)!;
    expect(s3.code).toBe('S1122-3');
    expect(s3.episodes.find((e) => e.number === 10)!.code).toBe('S1122-3-10');
    // El peso de la temporada es la suma de sus capítulos, no un dato aparte.
    expect(s3.sizeGb).toBeCloseTo(3.5);
  });

  it('sin temporadas no inventa ninguna', () => {
    expect(toSeasonDTOs('S1', [])).toEqual([]);
    expect(toSeasonDTOs('S1')).toEqual([]);
  });

  it('el código del catálogo lleva P en películas y S en episódicos (funcional §2.1)', () => {
    for (const m of getMovies()) expect(m.code.startsWith('P')).toBe(true);
    for (const e of getEpisodic()) expect(e.code.startsWith('S')).toBe(true);
  });

  it('getById devuelve el ítem por su id del catálogo', () => {
    const [first] = getCatalogIndex();
    expect(getById(first.id)).toBe(first);
    expect(getById('no-existe')).toBeUndefined();
  });

  it('las temporadas hidratadas cuelgan del código de su audiovisual', () => {
    // Hoy el catálogo no trae desglose por temporada; si algún día lo trae,
    // este test empieza a cubrirlo sin tocarlo.
    for (const e of getEpisodic()) {
      for (const s of e.seasons ?? []) {
        expect(s.code).toBe(`${e.code}-${s.number}`);
        for (const ep of s.episodes) expect(ep.code).toBe(`${s.code}-${ep.number}`);
      }
    }
  });
});

describe('pricing (funcional §8)', () => {
  it('usa la tarifa de estreno/normal por tipo', () => {
    expect(priceFor('movie', false)).toBe(DEFAULT_RATE.movie.normal);
    expect(priceFor('movie', true)).toBe(DEFAULT_RATE.movie.premiere);
  });

  it('multiplica por capítulos en episódicos', () => {
    expect(priceFor('series', false, 3)).toBe(DEFAULT_RATE.series.normal * 3);
    expect(priceFor('series', true, 10)).toBe(DEFAULT_RATE.series.premiere * 10);
  });

  it('reutiliza la regla de Audiovisual.price', () => {
    const av = new Audiovisual('1', 'movie', 'x', 2000, 8, 1, true);
    expect(av.price(DEFAULT_RATE)).toBe(priceFor('movie', true));
  });
});

describe('totales de List (funcional §7.2-7.3)', () => {
  it('suma GB y precios, y compara contra espacio', () => {
    const list = new List([
      new ListItem('P0023', 'audiovisual', '23', 'A', 1.4, 10),
      new ListItem('P0451', 'audiovisual', '451', 'B', 4.8, 20),
    ]);
    expect(list.totalGb()).toBeCloseTo(6.2);
    expect(list.totalPrice()).toBe(30);
    expect(list.fitsIn(8)).toBe(true);
    expect(list.fitsIn(5)).toBe(false);
    expect(list.overflowGb(5)).toBeCloseTo(1.2);
  });
});
