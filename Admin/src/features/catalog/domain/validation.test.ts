import { describe, expect, it } from 'vitest';
import { validateAudiovisualInput } from './validation';
import type { AudiovisualInput } from '../types';

const base: AudiovisualInput = {
  type: 'movie',
  name: 'Inception',
  year: 2010,
  rating: 8.8,
  sizeGb: 5,
  isPremiere: false,
};

describe('validateAudiovisualInput (regla del dominio)', () => {
  it('no devuelve errores para una entrada válida', () => {
    expect(validateAudiovisualInput(base)).toEqual([]);
  });

  it('exige nombre', () => {
    expect(validateAudiovisualInput({ ...base, name: '' })).toContain('El nombre es obligatorio.');
  });

  it('valida el rango del rating', () => {
    const errors = validateAudiovisualInput({ ...base, rating: 11 });
    expect(errors.some((e) => /rating/i.test(e))).toBe(true);
  });

  it('exige peso en películas pero no en episódicos', () => {
    expect(validateAudiovisualInput({ ...base, sizeGb: 0 })).toContain(
      'Una película necesita peso en GB.',
    );
    // Para episódicos el peso 0 es válido (vive en temporadas/capítulos).
    expect(validateAudiovisualInput({ ...base, type: 'series', sizeGb: 0 })).toEqual([]);
  });
});
