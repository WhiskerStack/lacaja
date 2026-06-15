import { PriceRate, type PriceRateDTO, type Rate, rateFromRates } from '@dahem/domain';
import { Injectable } from '@nestjs/common';
import { PriceRateRepository } from '../domain/PriceRateRepository';

/** Lee y actualiza las tarifas configurables por tipo (funcional §8). Resuelve la Rate para el cálculo de precios. */
@Injectable()
export class PricingService {
  constructor(private readonly repo: PriceRateRepository) {}

  async getRates(): Promise<PriceRate[]> {
    return this.repo.findAll();
  }

  /** Tarifa resuelta por tipo (normal/premiere), con defaults si falta alguna fila. */
  async resolveRate(): Promise<Rate> {
    const rates = await this.repo.findAll();
    return rateFromRates(rates.map((r) => r.toJSON()));
  }

  /** Hace upsert de cada fila (type, key) recibida y devuelve el conjunto resultante. */
  async updateRates(rows: PriceRateDTO[]): Promise<PriceRate[]> {
    for (const r of rows) {
      await this.repo.upsert(new PriceRate(r.type, r.key, r.priceCup));
    }
    return this.repo.findAll();
  }
}
