import { SubmissionItem } from './SubmissionItem';
import type { WebSubmissionDTO } from '../features/common/domain/types';

/**
 * Envío de lista por web: snapshot congelado (modelo de datos WEB_SUBMISSION).
 * Al enviar se copia qué se pidió y a qué precio; no apunta al catálogo vivo porque
 * catálogo y tarifas cambian y el envío debe reflejar el momento.
 */
export class WebSubmission {
  constructor(
    public readonly userId: number,
    public readonly submissionCode: string,
    public readonly createdAt: string,
    public readonly items: SubmissionItem[],
    public readonly id?: number,
  ) {}

  totalGb(): number {
    return this.items.reduce((sum, i) => sum + i.sizeGb, 0);
  }

  totalPrice(): number {
    return this.items.reduce((sum, i) => sum + i.price, 0);
  }

  static fromJSON(d: WebSubmissionDTO): WebSubmission {
    return new WebSubmission(
      d.userId,
      d.submissionCode,
      d.createdAt,
      (d.items ?? []).map(SubmissionItem.fromJSON),
      d.id,
    );
  }

  toJSON(): WebSubmissionDTO {
    return {
      id: this.id,
      userId: this.userId,
      submissionCode: this.submissionCode,
      createdAt: this.createdAt,
      totalGb: this.totalGb(),
      totalPrice: this.totalPrice(),
      items: this.items.map((i) => i.toJSON()),
    };
  }
}

/** Genera un código de envío corto y legible (sin depender de Date.now en dominio puro). */
export function makeSubmissionCode(seed: number): string {
  const base36 = Math.abs(Math.floor(seed)).toString(36).toUpperCase().padStart(5, '0');
  return `E-${base36.slice(-5)}`;
}
