// Núcleo del patrón Criteria (arquitectura §5.1). Objeto inmutable que describe
// QUÉ buscar (filtros, orden, paginación) de forma agnóstica de la base de datos.
// Un solo `match(criteria)` reemplaza la familia de findByX.

export type Operator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'IN' | 'LIKE';
export type LogicalOperator = 'AND' | 'OR';

export interface Filter {
  field: string;
  operator: Operator;
  value: unknown;
}

export interface CompositeFilter {
  operator: LogicalOperator;
  filters: CriteriaFilter[];
}

export type CriteriaFilter = Filter | CompositeFilter;

export interface Order {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface CriteriaOptions {
  filters?: CriteriaFilter[];
  orders?: Order[];
  limit?: number;
  offset?: number;
}

/** Discrimina un Filter simple de un CompositeFilter. */
export function isCompositeFilter(f: CriteriaFilter): f is CompositeFilter {
  return (f as CompositeFilter).filters !== undefined;
}

export class Criteria {
  constructor(private readonly options: CriteriaOptions = {}) {}

  getFilters(): CriteriaFilter[] {
    return this.options.filters ?? [];
  }

  getOrders(): Order[] {
    return this.options.orders ?? [];
  }

  getLimit(): number | undefined {
    return this.options.limit;
  }

  getOffset(): number | undefined {
    return this.options.offset;
  }

  hasFilters(): boolean {
    return this.getFilters().length > 0;
  }

  /** Devuelve una copia con nuevas opciones combinadas (mantiene la inmutabilidad). */
  with(options: CriteriaOptions): Criteria {
    return new Criteria({ ...this.options, ...options });
  }

  /** Combina varios Criteria bajo un AND lógico (composición, arquitectura §5.1). */
  static and(...criterias: Criteria[]): Criteria {
    return Criteria.combine('AND', criterias);
  }

  /** Combina varios Criteria bajo un OR lógico. */
  static or(...criterias: Criteria[]): Criteria {
    return Criteria.combine('OR', criterias);
  }

  private static combine(operator: LogicalOperator, criterias: Criteria[]): Criteria {
    const allFilters = criterias.flatMap((c) => c.getFilters());
    const orders = criterias.flatMap((c) => c.getOrders());
    // El primer limit/offset definido prevalece.
    const limit = criterias.map((c) => c.getLimit()).find((v) => v !== undefined);
    const offset = criterias.map((c) => c.getOffset()).find((v) => v !== undefined);

    const filters: CriteriaFilter[] =
      allFilters.length > 0 ? [{ operator, filters: allFilters }] : [];

    return new Criteria({ filters, orders, limit, offset });
  }
}
