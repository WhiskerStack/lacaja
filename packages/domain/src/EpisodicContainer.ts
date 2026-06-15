import { Audiovisual } from './Audiovisual';
import type { Season } from './Season';
import type { AudiovisualType } from './types';

/**
 * Especializa a Audiovisual para contenido episódico (serie, telenovela, show, anime).
 * No se llama "Series" porque aplica a los cuatro tipos episódicos (modelo de datos §3.1).
 */
export class EpisodicContainer extends Audiovisual {
  constructor(
    id: number,
    type: AudiovisualType,
    name: string,
    year: number,
    rating: number,
    isPremiere: boolean,
    public readonly seasons: Season[] = [],
  ) {
    // El sizeGb del contenedor se deriva de las temporadas, no se pasa: 0 en el base.
    super(id, type, name, year, rating, 0, isPremiere);
  }

  /** El peso real del contenedor episódico es la suma de sus temporadas. */
  totalSizeGb(): number {
    return this.seasons.reduce((sum, s) => sum + s.sizeGb(), 0);
  }
}
