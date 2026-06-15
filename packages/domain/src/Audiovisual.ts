import { audiovisualCode } from './codes';
import type { AudiovisualDTO, AudiovisualType, Rate } from './types';

/**
 * Entidad raíz del catálogo y contenedor episódico (modelo de datos §3.1).
 * Encapsula sus reglas: genera su código, dice si es estreno, calcula su precio.
 */
export class Audiovisual {
  constructor(
    public readonly id: number,
    public readonly type: AudiovisualType,
    public readonly name: string,
    public readonly year: number,
    public readonly rating: number,
    public readonly sizeGb: number, // solo significativo si no es episódico
    public readonly isPremiere: boolean,
  ) {}

  /** Código corto del documento funcional (§2): P0023 para película, S1122 para episódico. */
  code(): string {
    return audiovisualCode(this.type, this.id);
  }

  /** Precio según sea estreno o normal. La tarifa viene de PRICE_RATE (configurable). */
  price(rate: Rate): number {
    return this.isPremiere ? rate.premiere : rate.normal;
  }

  isEpisodic(): boolean {
    return this.type !== 'movie';
  }

  /** Validación de negocio (regla del dominio, no del DTO de entrada). */
  validate(): string[] {
    const errors: string[] = [];
    if (!this.name.trim()) errors.push('El nombre es obligatorio.');
    if (this.year < 1900) errors.push('Año inválido.');
    if (this.rating < 0 || this.rating > 10) errors.push('El rating debe estar entre 0 y 10.');
    if (!this.isEpisodic() && this.sizeGb <= 0)
      errors.push('Una película necesita peso en GB.');
    return errors;
  }

  static fromJSON(d: AudiovisualDTO): Audiovisual {
    return new Audiovisual(d.id, d.type, d.name, d.year, d.rating, d.sizeGb, d.isPremiere);
  }

  /** Alias semántico para el backend (la frontera es la BD). */
  static fromRow = Audiovisual.fromJSON;

  toJSON(): AudiovisualDTO {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      year: this.year,
      rating: this.rating,
      sizeGb: this.sizeGb,
      isPremiere: this.isPremiere,
    };
  }

  toRow(): AudiovisualDTO {
    return this.toJSON();
  }
}
