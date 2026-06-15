import { ContentRequest, type RequestStatus } from '@dahem/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Criteria } from '../../../shared/criteria/Criteria';
import {
  CriteriaToDrizzleTransformer,
  type FieldMap,
} from '../../../shared/criteria/CriteriaToDrizzleTransformer';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { ContentRequestRepository } from '../domain/ContentRequestRepository';
import { requests } from './requests.schema';

const REQUEST_FIELDS: FieldMap = {
  id: requests.id,
  userId: requests.userId,
  status: requests.status,
  searchText: requests.searchText,
};

@Injectable()
export class DrizzleContentRequestRepository extends ContentRequestRepository {
  private readonly transformer = new CriteriaToDrizzleTransformer(REQUEST_FIELDS);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async match(criteria: Criteria): Promise<ContentRequest[]> {
    const { where, orderBy, limit, offset } = this.transformer.transform(criteria);
    let query = this.db.select().from(requests).$dynamic();
    if (where) query = query.where(where);
    if (orderBy.length) query = query.orderBy(...orderBy);
    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);
    const rows = await query;
    return rows.map((r) => new ContentRequest(r.userId, r.searchText, r.status as RequestStatus, r.id));
  }

  async findById(id: number): Promise<ContentRequest | null> {
    const [r] = await this.db.select().from(requests).where(eq(requests.id, id)).limit(1);
    return r ? new ContentRequest(r.userId, r.searchText, r.status as RequestStatus, r.id) : null;
  }

  async save(entity: ContentRequest): Promise<ContentRequest> {
    if (entity.id) {
      const [r] = await this.db
        .update(requests)
        .set({ status: entity.status, searchText: entity.searchText })
        .where(eq(requests.id, entity.id))
        .returning();
      return new ContentRequest(r.userId, r.searchText, r.status as RequestStatus, r.id);
    }
    const [r] = await this.db
      .insert(requests)
      .values({ userId: entity.userId, searchText: entity.searchText, status: entity.status })
      .returning();
    return new ContentRequest(r.userId, r.searchText, r.status as RequestStatus, r.id);
  }
}
