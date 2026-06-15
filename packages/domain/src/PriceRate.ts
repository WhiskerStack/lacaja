import type { AudiovisualType, PriceKey, PriceRateDTO, Rate, TypeRate } from './types';

/** Todos los tipos de audiovisual con tarifa configurable (orden de presentación en admin). */
export const AUDIOVISUAL_TYPES: AudiovisualType[] = [
  'movie',
  'series',
  'telenovela',
  'show',
  'anime',
];

/** Tarifa configurable por tipo de audiovisual (modelo de datos PRICE_RATE). Moneda: CUP. */
export class PriceRate {
  constructor(
    public readonly type: AudiovisualType,
    public readonly key: PriceKey,
    public readonly priceCup: number,
  ) {}

  static fromJSON(d: PriceRateDTO): PriceRate {
    return new PriceRate(d.type, d.key, d.priceCup);
  }

  toJSON(): PriceRateDTO {
    return { type: this.type, key: this.key, priceCup: this.priceCup };
  }
}

/** Valores iniciales de referencia (funcional §8.2): normal $10, estreno $20. */
const DEFAULT_TYPE_RATE: TypeRate = { normal: 10, premiere: 20 };

/** Tarifa por defecto: los mismos valores de referencia para cada tipo. */
export const DEFAULT_RATE: Rate = {
  movie: { ...DEFAULT_TYPE_RATE },
  series: { ...DEFAULT_TYPE_RATE },
  telenovela: { ...DEFAULT_TYPE_RATE },
  show: { ...DEFAULT_TYPE_RATE },
  anime: { ...DEFAULT_TYPE_RATE },
};

/** Construye una Rate por tipo a partir de las filas de PRICE_RATE, cayendo a los defaults. */
export function rateFromRates(rates: PriceRateDTO[]): Rate {
  const result: Rate = {
    movie: { ...DEFAULT_RATE.movie },
    series: { ...DEFAULT_RATE.series },
    telenovela: { ...DEFAULT_RATE.telenovela },
    show: { ...DEFAULT_RATE.show },
    anime: { ...DEFAULT_RATE.anime },
  };
  for (const r of rates) {
    if (result[r.type]) result[r.type][r.key] = r.priceCup;
  }
  return result;
}
