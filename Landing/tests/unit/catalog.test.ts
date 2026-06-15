// Tests de la generación de códigos por nivel y totales de lista vía @dahem/domain.
import { describe, it, expect } from 'vitest';
import { List, ListItem, Audiovisual, DEFAULT_RATE } from '@dahem/domain';
import { getById, getEpisodic } from '../../src/features/catalog/logic/buildData';
import { priceFor } from '../../src/features/catalog/logic/pricing';

describe('códigos por nivel (funcional §6.3.1)', () => {
  it('genera S1122 / S1122-3 / S1122-3-10 desde el catálogo de muestra', () => {
    const series = getById(1122)!;
    expect(series.code).toBe('S1122');
    const s3 = series.seasons!.find((s) => s.number === 3)!;
    expect(s3.code).toBe('S1122-3');
    const ep10 = s3.episodes.find((e) => e.number === 10)!;
    expect(ep10.code).toBe('S1122-3-10');
  });

  it('toda serie episódica tiene al menos una temporada', () => {
    for (const e of getEpisodic()) {
      expect((e.seasons?.length ?? 0)).toBeGreaterThan(0);
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
    const av = new Audiovisual(1, 'movie', 'x', 2000, 8, 1, true);
    expect(av.price(DEFAULT_RATE)).toBe(priceFor('movie', true));
  });
});

describe('totales de List (funcional §7.2-7.3)', () => {
  it('suma GB y precios, y compara contra espacio', () => {
    const list = new List([
      new ListItem('P0023', 'audiovisual', 23, 'A', 1.4, 10),
      new ListItem('P0451', 'audiovisual', 451, 'B', 4.8, 20),
    ]);
    expect(list.totalGb()).toBeCloseTo(6.2);
    expect(list.totalPrice()).toBe(30);
    expect(list.fitsIn(8)).toBe(true);
    expect(list.fitsIn(5)).toBe(false);
    expect(list.overflowGb(5)).toBeCloseTo(1.2);
  });
});
