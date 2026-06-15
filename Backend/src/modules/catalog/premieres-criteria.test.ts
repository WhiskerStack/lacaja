import { describe, expect, it } from 'vitest';
import { PremieresCriteria } from './domain/PremieresCriteria';

describe('PremieresCriteria', () => {
  it('filtra por estreno y ordena por año descendente', () => {
    const c = new PremieresCriteria({ limit: 5 });
    const filters = c.getFilters() as { field: string; value: unknown }[];
    expect(filters).toContainEqual({ field: 'isPremiere', operator: '=', value: true });
    expect(c.getOrders()[0]).toEqual({ field: 'year', direction: 'DESC' });
    expect(c.getLimit()).toBe(5);
  });

  it('añade el filtro de tipo cuando se pasa', () => {
    const c = new PremieresCriteria({ type: 'movie' });
    const filters = c.getFilters() as { field: string; value: unknown }[];
    expect(filters).toContainEqual({ field: 'type', operator: '=', value: 'movie' });
  });
});
