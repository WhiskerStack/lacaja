// Pricing: tarifa por tipo de audiovisual (funcional §8). En episódicos el precio es por
// capítulo, por lo que se multiplica por la cantidad de capítulos agregados. DEFAULT_RATE de
// @dahem/domain para build/offline; fetchRate() intenta /pricing en runtime (especificaciones §8.3).

import { Rate } from "@/features/common/domain/types";
import { AudiovisualType } from "../types";
import { DEFAULT_RATE } from "@/domains/PriceRate";
import { Audiovisual } from "@/features/audiovisual/domain/Audiovisual";


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
  const av = new Audiovisual('0', type, 'x', 2000, 0, 1, isPremiere);
  return av.price(rate) * units;
}
