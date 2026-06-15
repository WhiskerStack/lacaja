import { User } from '@daher/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { UserRecord, UserRepository } from '../domain/UserRepository';
import { users } from './account.schema';

@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async findById(id: number): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) return null;
    return new User(
      row.firstName,
      row.lastName,
      row.email ?? undefined,
      row.phone ?? undefined,
      row.id,
    );
  }

  async findByContact(email?: string, phone?: string): Promise<UserRecord | null> {
    const conditions = [];
    if (email) conditions.push(eq(users.email, email));
    if (phone) conditions.push(eq(users.phone, phone));
    if (conditions.length === 0) return null;

    const [row] = await this.db
      .select()
      .from(users)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions))
      .limit(1);
    if (!row) return null;
    return {
      user: new User(
        row.firstName,
        row.lastName,
        row.email ?? undefined,
        row.phone ?? undefined,
        row.id,
      ),
      passwordHash: row.passwordHash ?? null,
    };
  }

  async create(user: User, passwordHash: string | null): Promise<User> {
    const [row] = await this.db
      .insert(users)
      .values({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email ?? null,
        phone: user.phone ?? null,
        passwordHash,
      })
      .returning();
    return new User(
      row.firstName,
      row.lastName,
      row.email ?? undefined,
      row.phone ?? undefined,
      row.id,
    );
  }
}
