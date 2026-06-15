import { PriceRate, type AudiovisualType, type PriceKey } from '@dahem/domain';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { PriceRateRepository } from '../domain/PriceRateRepository';
import { priceRates } from './pricing.schema';

@Injectable()
export class DrizzlePriceRateRepository extends PriceRateRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async findAll(): Promise<PriceRate[]> {
    const rows = await this.db.select().from(priceRates);
    return rows.map((r) => new PriceRate(r.type as AudiovisualType, r.key as PriceKey, r.priceCup));
  }

  async upsert(rate: PriceRate): Promise<PriceRate> {
    const [row] = await this.db
      .insert(priceRates)
      .values({ type: rate.type, key: rate.key, priceCup: rate.priceCup })
      .onConflictDoUpdate({
        target: [priceRates.type, priceRates.key],
        set: { priceCup: rate.priceCup },
      })
      .returning();
    return new PriceRate(row.type as AudiovisualType, row.key as PriceKey, row.priceCup);
  }
}
