import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('combina clases simples', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('ignora valores falsy', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('resuelve conflictos de Tailwind dejando la última', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('soporta objetos condicionales', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});
