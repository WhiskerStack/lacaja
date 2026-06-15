import { Criteria } from '../../../shared/criteria/Criteria';

/**
 * Criterio especializado (arquitectura §5.1): estrenos del catálogo, ordenados por año.
 * Vive en domain/ porque codifica una regla de negocio reutilizable. El controller nunca
 * lo instancia; lo hace el servicio.
 */
export class PremieresCriteria extends Criteria {
  constructor(params: { limit?: number; type?: string } = {}) {
    const filters = [
      { field: 'isPremiere', operator: '=' as const, value: true },
      ...(params.type ? [{ field: 'type', operator: '=' as const, value: params.type }] : []),
    ];
    super({
      filters,
      orders: [{ field: 'year', direction: 'DESC' }],
      limit: params.limit ?? 20,
    });
  }
}
