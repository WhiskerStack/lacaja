import { rateFromRates, type Rate } from '@daher/domain';
import type { PricingApi } from '../api/PricingApi';
import type { PricingInput } from '../types';

/** Orquesta el slice de tarifas; resuelve las filas a una Rate utilizable. */
export class PricingService {
  constructor(private readonly pricingApi: PricingApi) {}

  /** Devuelve la tarifa resuelta (normal/premiere) lista para mostrar/editar. */
  async getRate(): Promise<Rate> {
    const rates = await this.pricingApi.list();
    return rateFromRates(rates);
  }

  async update(input: PricingInput): Promise<Rate> {
    if (input.normal < 0 || input.premiere < 0) {
      throw new Error('Las tarifas no pueden ser negativas.');
    }
    const rates = await this.pricingApi.update(input);
    return rateFromRates(rates);
  }
}
