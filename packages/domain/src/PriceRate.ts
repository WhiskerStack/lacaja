import type { PriceKey, PriceRateDTO, Rate } from './types';

/** Tarifa configurable (modelo de datos PRICE_RATE). Moneda: CUP. */
export class PriceRate {
  constructor(
    public readonly key: PriceKey,
    public readonly priceCup: number,
  ) {}

  static fromJSON(d: PriceRateDTO): PriceRate {
    return new PriceRate(d.key, d.priceCup);
  }

  toJSON(): PriceRateDTO {
    return { key: this.key, priceCup: this.priceCup };
  }
}

/** Valores iniciales de referencia (funcional §8.2): normal $10, estreno $20. */
export const DEFAULT_RATE: Rate = { normal: 10, premiere: 20 };

/** Construye una Rate a partir de las filas de PRICE_RATE. */
export function rateFromRates(rates: PriceRateDTO[]): Rate {
  const normal = rates.find((r) => r.key === 'normal')?.priceCup ?? DEFAULT_RATE.normal;
  const premiere = rates.find((r) => r.key === 'premiere')?.priceCup ?? DEFAULT_RATE.premiere;
  return { normal, premiere };
}
