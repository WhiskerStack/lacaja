import { describe, expect, it } from 'vitest';
import {
  Audiovisual,
  EpisodicContainer,
  Season,
  Episode,
  List,
  ListItem,
  User,
  isCode,
  DEFAULT_RATE,
  rateFromRates,
} from './index';

describe('Audiovisual', () => {
  it('genera código de película', () => {
    expect(new Audiovisual(23, 'movie', 'El Gigante de Hierro', 1999, 8, 1.2, false).code()).toBe('P23');
  });

  it('genera código de episódico', () => {
    expect(new Audiovisual(1122, 'series', 'Juego de Tronos', 2011, 9, 0, false).code()).toBe('S1122');
  });

  it('aplica precio de estreno vs normal', () => {
    const movie = new Audiovisual(1, 'movie', 'X', 2024, 7, 1, true);
    expect(movie.price(DEFAULT_RATE)).toBe(20);
    const normal = new Audiovisual(2, 'movie', 'Y', 2024, 7, 1, false);
    expect(normal.price(DEFAULT_RATE)).toBe(10);
  });

  it('valida que una película tenga peso', () => {
    expect(new Audiovisual(1, 'movie', 'X', 2024, 7, 0, false).validate()).toContain(
      'Una película necesita peso en GB.',
    );
  });

  it('round-trip fromJSON/toJSON', () => {
    const dto = { id: 5, type: 'anime' as const, name: 'Z', year: 2020, rating: 8.5, sizeGb: 3, isPremiere: true };
    expect(Audiovisual.fromJSON(dto).toJSON()).toEqual(dto);
  });
});

describe('EpisodicContainer / Season / Episode', () => {
  it('compone códigos jerárquicos', () => {
    const season = new Season('S1122', 3, [new Episode('S1122-3', 10, 0.4)]);
    expect(season.code()).toBe('S1122-3');
    expect(season.episodes[0].code()).toBe('S1122-3-10');
  });

  it('suma peso de temporadas', () => {
    const s1 = new Season('S1122', 1, [new Episode('S1122-1', 1, 0.5), new Episode('S1122-1', 2, 0.5)]);
    const s2 = new Season('S1122', 2, [new Episode('S1122-2', 1, 1)]);
    const container = new EpisodicContainer(1122, 'series', 'GoT', 2011, 9, false, [s1, s2]);
    expect(container.totalSizeGb()).toBe(2);
  });
});

describe('List', () => {
  const items = [
    new ListItem('P0023', 'audiovisual', 23, 'A', 4, 10),
    new ListItem('S1122-3', 'season', 3, 'B', 3, 10),
  ];

  it('suma GB y precio', () => {
    const list = new List(items);
    expect(list.totalGb()).toBe(7);
    expect(list.totalPrice()).toBe(20);
  });

  it('fitsIn y overflow', () => {
    const list = new List(items);
    expect(list.fitsIn(8)).toBe(true);
    expect(list.fitsIn(5)).toBe(false);
    expect(list.overflowGb(5)).toBe(2);
  });
});

describe('User', () => {
  it('exige una vía de contacto', () => {
    expect(new User('Ana', 'Pérez').validate()).toContain('Se requiere al menos un correo o un teléfono.');
    expect(new User('Ana', 'Pérez', 'a@b.com').validate()).toEqual([]);
  });
});

describe('codes / rates', () => {
  it('detecta códigos', () => {
    expect(isCode('S1122-3-10')).toBe(true);
    expect(isCode('P0023')).toBe(true);
    expect(isCode('juego de tronos')).toBe(false);
  });

  it('resuelve tarifa por tipo con defaults', () => {
    const rate = rateFromRates([{ type: 'movie', key: 'normal', priceCup: 15 }]);
    expect(rate.movie).toEqual({ normal: 15, premiere: 20 });
    // Los tipos sin fila caen al default de referencia.
    expect(rate.series).toEqual({ normal: 10, premiere: 20 });
  });

  it('aplica precio por tipo', () => {
    const rate = rateFromRates([
      { type: 'series', key: 'normal', priceCup: 5 },
      { type: 'series', key: 'premiere', priceCup: 8 },
    ]);
    expect(new Audiovisual(1, 'series', 'S', 2020, 8, 0, false).price(rate)).toBe(5);
    expect(new Audiovisual(2, 'series', 'S', 2020, 8, 0, true).price(rate)).toBe(8);
  });
});
