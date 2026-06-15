import { SubmissionItem, WebSubmission } from '@dahem/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { Criteria } from '../../../shared/criteria/Criteria';
import {
  CriteriaToDrizzleTransformer,
  type FieldMap,
} from '../../../shared/criteria/CriteriaToDrizzleTransformer';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { WebSubmissionRepository } from '../domain/WebSubmissionRepository';
import { submissionItems, webSubmissions } from './submission.schema';

// Allowlist: el admin busca por código y por usuario; el resto queda fuera.
const SUBMISSION_FIELDS: FieldMap = {
  id: webSubmissions.id,
  userId: webSubmissions.userId,
  submissionCode: webSubmissions.submissionCode,
};

@Injectable()
export class DrizzleWebSubmissionRepository extends WebSubmissionRepository {
  private readonly transformer = new CriteriaToDrizzleTransformer(SUBMISSION_FIELDS);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async match(criteria: Criteria): Promise<WebSubmission[]> {
    const { where, orderBy, limit, offset } = this.transformer.transform(criteria);
    let query = this.db.select().from(webSubmissions).$dynamic();
    if (where) query = query.where(where);
    if (orderBy.length) query = query.orderBy(...orderBy);
    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);
    const heads = await query;
    if (heads.length === 0) return [];

    const ids = heads.map((h) => h.id);
    const items = await this.db
      .select()
      .from(submissionItems)
      .where(inArray(submissionItems.submissionId, ids));

    return heads.map((h) => this.hydrate(h, items.filter((i) => i.submissionId === h.id)));
  }

  async findById(id: number): Promise<WebSubmission | null> {
    const [head] = await this.db
      .select()
      .from(webSubmissions)
      .where(eq(webSubmissions.id, id))
      .limit(1);
    if (!head) return null;
    const items = await this.db
      .select()
      .from(submissionItems)
      .where(eq(submissionItems.submissionId, id));
    return this.hydrate(head, items);
  }

  async save(entity: WebSubmission): Promise<WebSubmission> {
    return this.db.transaction(async (tx) => {
      const [head] = await tx
        .insert(webSubmissions)
        .values({
          userId: entity.userId,
          submissionCode: entity.submissionCode,
          createdAt: new Date(entity.createdAt),
          totalGb: entity.totalGb(),
          totalPrice: entity.totalPrice(),
        })
        .returning();

      if (entity.items.length > 0) {
        await tx.insert(submissionItems).values(
          entity.items.map((i) => ({
            submissionId: head.id,
            code: i.code,
            name: i.name,
            sizeGb: i.sizeGb,
            price: i.price,
          })),
        );
      }
      return this.hydrate(head, entity.items.map((i) => i.toJSON()));
    });
  }

  private hydrate(
    head: { id: number; userId: number; submissionCode: string; createdAt: Date },
    items: { code: string; name: string; sizeGb: number; price: number }[],
  ): WebSubmission {
    return new WebSubmission(
      head.userId,
      head.submissionCode,
      head.createdAt.toISOString(),
      items.map((i) => new SubmissionItem(i.code, i.name, i.sizeGb, i.price)),
      head.id,
    );
  }
}
