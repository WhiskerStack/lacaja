import { PriceRate, type PriceKey } from '@daher/domain';
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
    return rows.map((r) => new PriceRate(r.key as PriceKey, r.priceCup));
  }

  async upsert(rate: PriceRate): Promise<PriceRate> {
    const [row] = await this.db
      .insert(priceRates)
      .values({ key: rate.key, priceCup: rate.priceCup })
      .onConflictDoUpdate({ target: priceRates.key, set: { priceCup: rate.priceCup } })
      .returning();
    return new PriceRate(row.key as PriceKey, row.priceCup);
  }
}
