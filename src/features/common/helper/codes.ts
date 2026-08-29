import type { AudiovisualType } from '../domain/types';

/** Letra inicial del código según el tipo (funcional §2.1). P = película, S = episódico. */
export function typeLetter(type: AudiovisualType): string {
  return type === 'movie' ? 'P' : 'S';
}

/**
 * Código base de un audiovisual: P23 / S1122 (funcional §2.2). Mismo formato que el
 * código del inventario físico (letra + número, sin relleno), de modo que el alta manual
 * y la importación del SearchEngine producen códigos homogéneos.
 */
export function audiovisualCode(type: AudiovisualType, id: number): string {
  return `${typeLetter(type)}${id}`;
}

/** Código de un cliente del sistema: U + id (p. ej. U123). Inmutable y autogenerado. */
export function userCode(id: number): string {
  return `U${id}`;
}

/** Detecta si una query es un código de audiovisual (búsqueda §2.4). */
export const CODE_PATTERN = /^[PS]\d+(-\d+)?(-\d+)?$/i;

export function isCode(input: string): boolean {
  return CODE_PATTERN.test(input.trim().toUpperCase());
}
