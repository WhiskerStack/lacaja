import { AdminUser } from '@daher/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { AdminUserRecord, AdminUserRepository } from '../domain/AdminUserRepository';
import { adminUsers } from './admin.schema';

@Injectable()
export class DrizzleAdminUserRepository extends AdminUserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async count(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(adminUsers);
    return row?.value ?? 0;
  }

  async findByUsername(username: string): Promise<AdminUserRecord | null> {
    const [row] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);
    if (!row) return null;
    return {
      user: new AdminUser(row.username, row.displayName, row.id, row.createdAt.toISOString()),
      passwordHash: row.passwordHash,
    };
  }

  async list(): Promise<AdminUser[]> {
    const rows = await this.db.select().from(adminUsers);
    return rows.map(
      (r) => new AdminUser(r.username, r.displayName, r.id, r.createdAt.toISOString()),
    );
  }

  async create(username: string, passwordHash: string, displayName: string): Promise<AdminUser> {
    const [row] = await this.db
      .insert(adminUsers)
      .values({ username, passwordHash, displayName })
      .returning();
    return new AdminUser(row.username, row.displayName, row.id, row.createdAt.toISOString());
  }
}
