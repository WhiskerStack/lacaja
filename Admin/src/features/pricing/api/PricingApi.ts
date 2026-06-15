import type { HttpClient } from '@/app/http';
import type { PriceRateDTO } from '@dahem/domain';

/** Llamadas HTTP de tarifas a NestJS. Solo I/O. */
export class PricingApi {
  constructor(private readonly http: HttpClient) {}

  /** GET público de tarifas (filas PRICE_RATE por tipo). */
  list(): Promise<PriceRateDTO[]> {
    return this.http.get<PriceRateDTO[]>('/pricing');
  }

  /** PUT admin: actualiza las tarifas por tipo. Devuelve las filas resultantes. */
  update(rates: PriceRateDTO[]): Promise<PriceRateDTO[]> {
    return this.http.put<PriceRateDTO[]>('/admin/pricing', { rates });
  }
}
