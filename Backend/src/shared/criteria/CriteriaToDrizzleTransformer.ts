import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  ne,
  or,
  type SQL,
} from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';
import {
  Criteria,
  isCompositeFilter,
  type CriteriaFilter,
  type Filter,
  type Operator,
} from './Criteria';

/**
 * Allowlist tipado: nombre público del campo → columna real de Drizzle.
 * Lo que NO está aquí no se puede filtrar ni ordenar (arquitectura §5.3). Es la
 * mitigación de inyección/sobreexposición POR CAMPO: `password_hash`, FKs internas,
 * etc. quedan fuera salvo que se declaren explícitamente.
 */
export type FieldMap = Record<string, AnyColumn>;

export interface TransformResult {
  where?: SQL;
  orderBy: SQL[];
  limit?: number;
  offset?: number;
}

export class CriteriaToDrizzleTransformer {
  constructor(private readonly fieldMap: FieldMap) {}

  transform(criteria: Criteria): TransformResult {
    const filters = criteria.getFilters();
    const where =
      filters.length > 0
        ? and(...filters.map((f) => this.toCondition(f)).filter((c): c is SQL => c !== undefined))
        : undefined;

    const orderBy = criteria.getOrders().map((o) => {
      const column = this.resolveColumn(o.field);
      return o.direction === 'DESC' ? desc(column) : asc(column);
    });

    return {
      where: where as SQL | undefined,
      orderBy,
      limit: criteria.getLimit(),
      offset: criteria.getOffset(),
    };
  }

  /**
   * ÚNICO punto de entrada de datos no confiables (el `field` nace del HTTP en runtime).
   * TypeScript no puede garantizar que exista en el mapa, así que se valida aquí y se
   * lanza de forma controlada antes de tocar la BD (arquitectura §5.3, blog §6).
   */
  private resolveColumn(field: string): AnyColumn {
    const column = this.fieldMap[field];
    if (!column) {
      throw new Error(`Campo no permitido en el Criteria: "${field}".`);
    }
    return column;
  }

  private toCondition(filter: CriteriaFilter): SQL | undefined {
    if (isCompositeFilter(filter)) {
      const conditions = filter.filters
        .map((f) => this.toCondition(f))
        .filter((c): c is SQL => c !== undefined);
      if (conditions.length === 0) return undefined;
      return filter.operator === 'OR' ? or(...conditions) : and(...conditions);
    }
    return this.applyOperator(filter);
  }

  private applyOperator(filter: Filter): SQL {
    const column = this.resolveColumn(filter.field);
    const value = filter.value;

    // Tabla de operadores tipada contra Operator: si se añade uno al Criteria y se
    // olvida aquí, el compilador avisa (exhaustividad del switch).
    const operator: Operator = filter.operator;
    switch (operator) {
      case '=':
        return eq(column, value);
      case '!=':
        return ne(column, value);
      case '<':
        return lt(column, value);
      case '<=':
        return lte(column, value);
      case '>':
        return gt(column, value);
      case '>=':
        return gte(column, value);
      case 'IN':
        return inArray(column, Array.isArray(value) ? value : [value]);
      case 'LIKE':
        // ilike + comodines: búsqueda parcial case-insensitive. Drizzle parametriza el valor.
        return ilike(column, `%${String(value)}%`);
      default: {
        const _exhaustive: never = operator;
        throw new Error(`Operador no soportado: ${String(_exhaustive)}`);
      }
    }
  }
}
