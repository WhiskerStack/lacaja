import type { AudiovisualType } from './types';

/** Letra inicial del código según el tipo (funcional §2.1). P = película, S = episódico. */
export function typeLetter(type: AudiovisualType): string {
  return type === 'movie' ? 'P' : 'S';
}

/** Código base de un audiovisual: P0023 / S1122 (funcional §2.2). */
export function audiovisualCode(type: AudiovisualType, id: number): string {
  return `${typeLetter(type)}${String(id).padStart(4, '0')}`;
}

/** Detecta si una query es un código de audiovisual (búsqueda §2.4). */
export const CODE_PATTERN = /^[PS]\d{4}(-\d+)?(-\d+)?$/i;

export function isCode(input: string): boolean {
  return CODE_PATTERN.test(input.trim().toUpperCase());
}
