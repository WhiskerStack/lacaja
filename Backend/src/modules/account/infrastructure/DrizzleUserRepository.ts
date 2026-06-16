import { User, userCode } from '@dahem/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { UpdateUserData, UserRecord, UserRepository } from '../domain/UserRepository';
import { users } from './account.schema';

type UserRow = typeof users.$inferSelect;

/** Hidrata una fila de `user` a la entidad de dominio. */
function toUser(row: UserRow): User {
  return new User(
    row.firstName,
    row.lastName,
    row.email ?? undefined,
    row.phone ?? undefined,
    row.id,
    row.code,
    row.banned,
  );
}

@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async findById(id: number): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
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
    return { user: toUser(row), passwordHash: row.passwordHash ?? null, banned: row.banned };
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
    // Materializamos el código inmutable U{id} ahora que conocemos el id.
    const [withCode] = await this.db
      .update(users)
      .set({ code: userCode(row.id) })
      .where(eq(users.id, row.id))
      .returning();
    return toUser(withCode);
  }

  async list(): Promise<User[]> {
    const rows = await this.db.select().from(users).orderBy(users.id);
    return rows.map(toUser);
  }

  async update(id: number, data: UpdateUserData): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
      })
      .where(eq(users.id, id))
      .returning();
    return row ? toUser(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return deleted.length > 0;
  }

  async setBanned(id: number, banned: boolean): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set({ banned })
      .where(eq(users.id, id))
      .returning();
    return row ? toUser(row) : null;
  }
}
