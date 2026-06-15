import { AUDIOVISUAL_TYPES, rateFromRates, type PriceRateDTO, type Rate } from '@dahem/domain';
import type { PricingApi } from '../api/PricingApi';
import type { PricingInput } from '../types';

/** Orquesta el slice de tarifas; convierte entre la Rate por tipo y las filas PRICE_RATE. */
export class PricingService {
  constructor(private readonly pricingApi: PricingApi) {}

  /** Devuelve la tarifa resuelta por tipo (normal/estreno) lista para mostrar/editar. */
  async getRate(): Promise<Rate> {
    const rates = await this.pricingApi.list();
    return rateFromRates(rates);
  }

  async update(input: PricingInput): Promise<Rate> {
    const rows: PriceRateDTO[] = [];
    for (const type of AUDIOVISUAL_TYPES) {
      const tr = input[type];
      if (tr.normal < 0 || tr.premiere < 0) {
        throw new Error('Las tarifas no pueden ser negativas.');
      }
      rows.push({ type, key: 'normal', priceCup: tr.normal });
      rows.push({ type, key: 'premiere', priceCup: tr.premiere });
    }
    const rates = await this.pricingApi.update(rows);
    return rateFromRates(rates);
  }
}
