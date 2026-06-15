import {
  makeSubmissionCode,
  SubmissionItem,
  WebSubmission,
  type AudiovisualType,
  type Rate,
} from '@dahem/domain';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Criteria, type CriteriaFilter } from '../../../shared/criteria/Criteria';
import { PricingService } from '../../pricing/application/PricingService';
import { WebSubmissionRepository } from '../domain/WebSubmissionRepository';

export interface SubmissionItemInput {
  code: string;
  name: string;
  sizeGb: number;
  /** Tipo de audiovisual, para resolver la tarifa cuando no viene el precio. */
  type?: AudiovisualType;
  /** Si se marca, se cobra la tarifa de estreno; si no, la normal. */
  isPremiere?: boolean;
  /** Nº de capítulos cubiertos por el ítem (1 para películas/capítulos sueltos). */
  units?: number;
  /** Precio explícito (snapshot del cliente). Si falta, se calcula desde PriceRate. */
  price?: number;
}

/**
 * Congela el snapshot del envío por web (modelo de datos WEB_SUBMISSION): genera el
 * submission_code, calcula el precio de cada ítem desde la tarifa vigente (si no vino dado)
 * y persiste totales congelados que no dependen del catálogo/tarifas futuras.
 */
@Injectable()
export class SubmissionService {
  constructor(
    private readonly repo: WebSubmissionRepository,
    private readonly pricing: PricingService,
  ) {}

  async create(userId: number, rawItems: SubmissionItemInput[]): Promise<WebSubmission> {
    const rate = await this.pricing.resolveRate();
    const items = rawItems.map(
      (i) =>
        new SubmissionItem(i.code, i.name, i.sizeGb, i.price ?? this.priceOf(i, rate)),
    );
    const code = makeSubmissionCode(Date.now() + userId);
    const submission = new WebSubmission(userId, code, new Date().toISOString(), items);
    return this.repo.save(submission);
  }

  /** Listado/búsqueda del admin por código, nombre o contacto (vía submission_code/userId). */
  list(search?: string): Promise<WebSubmission[]> {
    const filters: CriteriaFilter[] = search
      ? [{ field: 'submissionCode', operator: 'LIKE', value: search }]
      : [];
    return this.repo.match(
      new Criteria({ filters, orders: [{ field: 'id', direction: 'DESC' }] }),
    );
  }

  async findById(id: number): Promise<WebSubmission> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(`Envío ${id} no encontrado.`);
    return found;
  }

  private priceOf(item: SubmissionItemInput, rate: Rate): number {
    const typeRate = rate[item.type ?? 'movie'];
    const unit = item.isPremiere ? typeRate.premiere : typeRate.normal;
    return unit * (item.units ?? 1);
  }
}
