import { PriceRate, type Rate, rateFromRates } from '@daher/domain';
import { Injectable } from '@nestjs/common';
import { PriceRateRepository } from '../domain/PriceRateRepository';

/** Lee y actualiza las tarifas configurables (funcional §8). Resuelve la Rate para el cálculo de precios. */
@Injectable()
export class PricingService {
  constructor(private readonly repo: PriceRateRepository) {}

  async getRates(): Promise<PriceRate[]> {
    return this.repo.findAll();
  }

  /** Tarifa resuelta (normal/premiere), con defaults si falta alguna fila. */
  async resolveRate(): Promise<Rate> {
    const rates = await this.repo.findAll();
    return rateFromRates(rates.map((r) => r.toJSON()));
  }

  async updateRates(input: { normal?: number; premiere?: number }): Promise<PriceRate[]> {
    if (input.normal !== undefined) await this.repo.upsert(new PriceRate('normal', input.normal));
    if (input.premiere !== undefined)
      await this.repo.upsert(new PriceRate('premiere', input.premiere));
    return this.repo.findAll();
  }
}
