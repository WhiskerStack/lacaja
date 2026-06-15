import { PriceRate } from '@dahem/domain';

/** Puerto del repositorio de tarifas (modelo de datos PRICE_RATE). */
export abstract class PriceRateRepository {
  abstract findAll(): Promise<PriceRate[]>;
  abstract upsert(rate: PriceRate): Promise<PriceRate>;
}
