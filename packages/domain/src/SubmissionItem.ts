import type { SubmissionItemDTO } from './types';

/** Ítem congelado de un envío por web (snapshot, modelo de datos SUBMISSION_ITEM). */
export class SubmissionItem {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly sizeGb: number,
    public readonly price: number,
  ) {}

  static fromJSON(d: SubmissionItemDTO): SubmissionItem {
    return new SubmissionItem(d.code, d.name, d.sizeGb, d.price);
  }

  toJSON(): SubmissionItemDTO {
    return { code: this.code, name: this.name, sizeGb: this.sizeGb, price: this.price };
  }
}
