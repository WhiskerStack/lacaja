// Pricing: tarifa por tipo de audiovisual (funcional §8). En episódicos el precio es por
// capítulo, por lo que se multiplica por la cantidad de capítulos agregados. DEFAULT_RATE de
// @dahem/domain para build/offline; fetchRate() intenta /pricing en runtime (especificaciones §8.3).
import {
  Audiovisual,
  DEFAULT_RATE,
  rateFromRates,
  type AudiovisualType,
  type PriceRateDTO,
  type Rate,
} from '@dahem/domain';

/**
 * Precio de lo que se agrega a la lista: tarifa unitaria del tipo (según estreno/normal)
 * multiplicada por `units` (nº de capítulos; 1 para películas o capítulos sueltos).
 */
export function priceFor(
  type: AudiovisualType,
  isPremiere: boolean,
  units = 1,
  rate: Rate = DEFAULT_RATE,
): number {
  // Reutiliza la regla del dominio en vez de duplicarla.
  const av = new Audiovisual(0, type, 'x', 2000, 0, 1, isPremiere);
  return av.price(rate) * units;
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
