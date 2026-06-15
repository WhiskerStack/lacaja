// Pricing: tarifa por unidad agregada (funcional §8). DEFAULT_RATE de @dahem/domain para
// build/offline; fetchRate() intenta /pricing en runtime contra la API (especificaciones §8.3).
import { Audiovisual, DEFAULT_RATE, rateFromRates, type PriceRateDTO, type Rate } from '@dahem/domain';

/** Precio de un audiovisual según su flag de estreno y la tarifa. */
export function priceFor(isPremiere: boolean, rate: Rate = DEFAULT_RATE): number {
  // Reutiliza la regla del dominio en vez de duplicarla.
  const av = new Audiovisual(0, 'movie', 'x', 2000, 0, 1, isPremiere);
  return av.price(rate);
}

/** Intenta leer la tarifa configurable del backend; cae a DEFAULT_RATE si no hay red. */
export async function fetchRate(apiUrl: string, fetchFn: typeof fetch): Promise<Rate> {
  if (!apiUrl) return DEFAULT_RATE;
  try {
    const res = await fetchFn(`${apiUrl}/pricing`);
    if (!res.ok) return DEFAULT_RATE;
    const rows = (await res.json()) as PriceRateDTO[];
    return rateFromRates(rows);
  } catch {
    return DEFAULT_RATE;
  }
}
