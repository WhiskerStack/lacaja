import { Audiovisual, type AudiovisualType } from '@daher/domain';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Criteria, type CriteriaFilter } from '../../../shared/criteria/Criteria';
import { AudiovisualRepository } from '../domain/AudiovisualRepository';
import { CatalogMetadataRepository } from '../domain/CatalogMetadataRepository';
import { PremieresCriteria } from '../domain/PremieresCriteria';
import type { SearchCatalogParams } from './SearchCatalogParams';

export interface UpsertAudiovisualInput {
  id?: number;
  type: AudiovisualType;
  name: string;
  year: number;
  rating: number;
  sizeGb?: number;
  isPremiere?: boolean;
}

/**
 * Caso de uso del catálogo. DUEÑO del Criteria (arquitectura §5.4): traduce params →
 * Criteria aplicando defaults, orden y paginación. El controller sólo pasa la intención.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly repo: AudiovisualRepository, // el PUERTO, no el adapter
    private readonly metadata: CatalogMetadataRepository,
  ) {}

  /** Filtrado genérico: el servicio construye el Criteria y aplica la política de negocio. */
  async search(params: SearchCatalogParams): Promise<{ items: Audiovisual[]; total: number }> {
    const criteria = this.buildSearchCriteria(params);
    const [items, total] = await Promise.all([
      this.repo.match(criteria),
      this.repo.count(new Criteria({ filters: criteria.getFilters() })),
    ]);
    return { items, total };
  }

  async findById(id: number): Promise<Audiovisual> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(`Audiovisual ${id} no encontrado.`);
    return found;
  }

  /** Datos del home: estrenos + total. Varias consultas → el servicio manda (arquitectura §5.4). */
  async homeData(): Promise<{ premieres: Audiovisual[]; total: number }> {
    const premieres = await this.repo.match(new PremieresCriteria({ limit: 10 }));
    const total = await this.repo.count(new Criteria());
    return { premieres, total };
  }

  async create(input: UpsertAudiovisualInput): Promise<Audiovisual> {
    return this.persist(input);
  }

  async update(id: number, input: UpsertAudiovisualInput): Promise<Audiovisual> {
    await this.findById(id); // 404 si no existe
    return this.persist({ ...input, id });
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.repo.delete(id);
  }

  // --- Metadatos (catálogos, reparto, trailers, jerarquía episódica) ---
  get meta(): CatalogMetadataRepository {
    return this.metadata;
  }

  private async persist(input: UpsertAudiovisualInput): Promise<Audiovisual> {
    const entity = new Audiovisual(
      input.id ?? 0,
      input.type,
      input.name,
      input.year,
      input.rating,
      input.sizeGb ?? 0,
      input.isPremiere ?? false,
    );
    const errors = entity.validate(); // la regla vive en el dominio
    if (errors.length) throw new BadRequestException(errors.join(' '));
    return this.repo.save(entity);
  }

  private buildSearchCriteria(params: SearchCatalogParams): Criteria {
    const filters: CriteriaFilter[] = [];
    if (params.type) filters.push({ field: 'type', operator: '=', value: params.type });
    if (params.name) filters.push({ field: 'name', operator: 'LIKE', value: params.name });
    if (params.isPremiere !== undefined)
      filters.push({ field: 'isPremiere', operator: '=', value: params.isPremiere });

    const pageSize = params.pageSize ?? 50;
    const page = params.page ?? 1;
    return new Criteria({
      filters,
      orders: [{ field: 'year', direction: 'DESC' }], // orden por defecto: decisión de negocio
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  }
}
