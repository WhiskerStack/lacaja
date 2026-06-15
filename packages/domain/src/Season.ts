import { Episode } from './Episode';

/** Temporada de un audiovisual episódico. Genera su tramo de código: S1122-3. */
export class Season {
  constructor(
    public readonly parentCode: string, // p.ej. "S1122"
    public readonly number: number,
    public readonly episodes: Episode[] = [],
    /** Peso declarado de la temporada; si hay capítulos, prevalece su suma. */
    private readonly declaredSizeGb = 0,
  ) {}

  code(): string {
    return `${this.parentCode}-${this.number}`; // "S1122-3"
  }

  sizeGb(): number {
    if (this.episodes.length === 0) return this.declaredSizeGb;
    return this.episodes.reduce((sum, e) => sum + e.sizeGb, 0);
  }
}
