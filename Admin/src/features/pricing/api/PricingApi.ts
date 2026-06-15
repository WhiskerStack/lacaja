import type { HttpClient } from '@/app/http';
import type { PriceRateDTO } from '@dahem/domain';
import type { PricingInput } from '../types';

/** Llamadas HTTP de tarifas a NestJS. Solo I/O. */
export class PricingApi {
  constructor(private readonly http: HttpClient) {}

  /** GET público de tarifas (filas PRICE_RATE). */
  list(): Promise<PriceRateDTO[]> {
    return this.http.get<PriceRateDTO[]>('/pricing');
  }

  /** PUT admin: actualiza normal/premiere. Devuelve las filas resultantes. */
  update(input: PricingInput): Promise<PriceRateDTO[]> {
    return this.http.put<PriceRateDTO[]>('/admin/pricing', input);
  }
}
