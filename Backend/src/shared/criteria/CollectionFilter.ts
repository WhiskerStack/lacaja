import {
  Criteria,
  isCompositeFilter,
  type CriteriaFilter,
  type Filter,
} from './Criteria';

/**
 * Aplica la MISMA semántica del Criteria (filtros, orden, paginación) sobre un array
 * en memoria. Sirve para repositorios fake en tests (arquitectura §8): se ejercita el
 * patrón Criteria de verdad sin Postgres ni mockear Drizzle.
 *
 * A diferencia del transformer de Drizzle, no aplica allowlist: en tests los datos son
 * de confianza y el `field` se accede por propiedad del objeto plano.
 */
export class CollectionFilter<T extends Record<string, unknown>> {
  constructor(private readonly items: T[]) {}

  findAll(criteria: Criteria): T[] {
    let result = this.items.filter((item) =>
      criteria.getFilters().every((f) => this.matchFilter(item, f)),
    );

    const orders = criteria.getOrders();
    if (orders.length > 0) {
      result = [...result].sort((a, b) => {
        for (const order of orders) {
          const av = a[order.field];
          const bv = b[order.field];
          if (av === bv) continue;
          const cmp = (av as number | string) < (bv as number | string) ? -1 : 1;
          return order.direction === 'DESC' ? -cmp : cmp;
        }
        return 0;
      });
    }

    const offset = criteria.getOffset() ?? 0;
    const limit = criteria.getLimit();
    return result.slice(offset, limit !== undefined ? offset + limit : undefined);
  }

  count(criteria: Criteria): number {
    return this.items.filter((item) =>
      criteria.getFilters().every((f) => this.matchFilter(item, f)),
    ).length;
  }

  private matchFilter(item: T, filter: CriteriaFilter): boolean {
    if (isCompositeFilter(filter)) {
      return filter.operator === 'OR'
        ? filter.filters.some((f) => this.matchFilter(item, f))
        : filter.filters.every((f) => this.matchFilter(item, f));
    }
    return this.matchSimple(item, filter);
  }

  private matchSimple(item: T, filter: Filter): boolean {
    const actual = item[filter.field];
    const value = filter.value;
    switch (filter.operator) {
      case '=':
        return actual === value;
      case '!=':
        return actual !== value;
      case '<':
        return (actual as number) < (value as number);
      case '<=':
        return (actual as number) <= (value as number);
      case '>':
        return (actual as number) > (value as number);
      case '>=':
        return (actual as number) >= (value as number);
      case 'IN':
        return Array.isArray(value) && value.includes(actual);
      case 'LIKE':
        return String(actual).toLowerCase().includes(String(value).toLowerCase());
      default:
        return false;
    }
  }
}
