import type { EpisodeDTO } from '../features/common/domain/types';

/** Capítulo de una temporada. Genera su tramo de código: S1122-3-10. */
export class Episode {
  constructor(
    public readonly seasonCode: string, // p.ej. "S1122-3"
    public readonly number: number,
    public readonly sizeGb: number,
    public readonly durationMin?: number,
  ) {}

  code(): string {
    return `${this.seasonCode}-${this.number}`; // "S1122-3-10"
  }
}
