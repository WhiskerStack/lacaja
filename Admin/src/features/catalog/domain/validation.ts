import { Audiovisual } from '@daher/domain';
import type { AudiovisualInput } from '../types';

/**
 * Valida el formulario de audiovisual usando la regla de negocio del dominio
 * (`Audiovisual.validate()`), no una validación ad-hoc de UI. El id es
 * irrelevante para la validación, así que se usa 0 para construir la entidad.
 */
export function validateAudiovisualInput(input: AudiovisualInput): string[] {
  const entity = new Audiovisual(
    0,
    input.type,
    input.name,
    input.year,
    input.rating,
    input.sizeGb,
    input.isPremiere,
  );
  return entity.validate();
}
