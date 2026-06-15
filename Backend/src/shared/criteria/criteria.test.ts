import { describe, expect, it } from 'vitest';
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { Criteria } from './Criteria';
import { CollectionFilter } from './CollectionFilter';
import { CriteriaToDrizzleTransformer, type FieldMap } from './CriteriaToDrizzleTransformer';

// Tabla de prueba mínima para el transformer.
const sample = pgTable('sample', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  secret: text('secret').notNull(),
});

const FIELDS: FieldMap = {
  id: sample.id,
  name: sample.name,
  year: sample.year,
  // `secret` NO está en el allowlist a propósito.
};

describe('Criteria', () => {
  it('es inmutable y expone filtros/orden/paginación', () => {
    const c = new Criteria({
      filters: [{ field: 'year', operator: '=', value: 2020 }],
      orders: [{ field: 'year', direction: 'DESC' }],
      limit: 10,
      offset: 5,
    });
    expect(c.getFilters()).toHaveLength(1);
    expect(c.getOrders()[0].direction).toBe('DESC');
    expect(c.getLimit()).toBe(10);
    expect(c.getOffset()).toBe(5);
  });

  it('and() agrupa filtros bajo un compuesto AND', () => {
    const a = new Criteria({ filters: [{ field: 'year', operator: '>', value: 2000 }] });
    const b = new Criteria({ filters: [{ field: 'name', operator: 'LIKE', value: 'x' }] });
    const combined = Criteria.and(a, b);
    const [composite] = combined.getFilters() as any;
    expect(composite.operator).toBe('AND');
    expect(composite.filters).toHaveLength(2);
  });
});

describe('CriteriaToDrizzleTransformer (allowlist)', () => {
  const transformer = new CriteriaToDrizzleTransformer(FIELDS);

  it('traduce un Criteria con filtros permitidos sin lanzar', () => {
    const result = transformer.transform(
      new Criteria({
        filters: [{ field: 'year', operator: '=', value: 1999 }],
        orders: [{ field: 'name', direction: 'ASC' }],
        limit: 5,
        offset: 0,
      }),
    );
    expect(result.where).toBeDefined();
    expect(result.orderBy).toHaveLength(1);
    expect(result.limit).toBe(5);
  });

  it('RECHAZA un campo fuera del allowlist (mitigación de sobreexposición)', () => {
    const malicious = new Criteria({
      filters: [{ field: 'secret', operator: '=', value: 'x' }],
    });
    expect(() => transformer.transform(malicious)).toThrow(/no permitido/i);
  });

  it('RECHAZA ordenar por un campo fuera del allowlist', () => {
    const c = new Criteria({ orders: [{ field: 'secret', direction: 'ASC' }] });
    expect(() => transformer.transform(c)).toThrow(/no permitido/i);
  });
});

describe('CollectionFilter (misma semántica en memoria)', () => {
  const rows = [
    { id: 1, name: 'Alpha', year: 2001 },
    { id: 2, name: 'Beta', year: 2020 },
    { id: 3, name: 'Gamma', year: 2010 },
  ];
  const filter = new CollectionFilter(rows);

  it('filtra, ordena y pagina como el Criteria', () => {
    const result = filter.findAll(
      new Criteria({
        filters: [{ field: 'year', operator: '>=', value: 2010 }],
        orders: [{ field: 'year', direction: 'DESC' }],
        limit: 1,
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Beta');
  });

  it('LIKE hace match parcial case-insensitive', () => {
    const result = filter.findAll(
      new Criteria({ filters: [{ field: 'name', operator: 'LIKE', value: 'amm' }] }),
    );
    expect(result.map((r) => r.name)).toEqual(['Gamma']);
  });

  it('count() respeta los filtros', () => {
    expect(filter.count(new Criteria({ filters: [{ field: 'year', operator: '>', value: 2005 }] }))).toBe(2);
  });
});
