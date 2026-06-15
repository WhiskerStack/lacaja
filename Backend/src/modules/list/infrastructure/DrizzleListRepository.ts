import { List, ListItem, type ItemLevel } from '@dahem/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { ListRepository } from '../domain/ListRepository';
import { listItems, lists } from './list.schema';

@Injectable()
export class DrizzleListRepository extends ListRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async findByUser(userId: number): Promise<List> {
    const [list] = await this.db.select().from(lists).where(eq(lists.userId, userId)).limit(1);
    if (!list) return new List([]);
    const rows = await this.db.select().from(listItems).where(eq(listItems.listId, list.id));
    return new List(
      rows.map(
        (r) => new ListItem(r.code, r.level as ItemLevel, this.targetId(r), r.name, r.sizeGb, r.price),
      ),
    );
  }

  async replace(userId: number, list: List, availableSpaceGb?: number): Promise<List> {
    return this.db.transaction(async (tx) => {
      // Upsert de la lista del usuario.
      let [row] = await tx.select().from(lists).where(eq(lists.userId, userId)).limit(1);
      if (!row) {
        [row] = await tx
          .insert(lists)
          .values({ userId, availableSpaceGb: availableSpaceGb ?? null })
          .returning();
      } else if (availableSpaceGb !== undefined) {
        await tx.update(lists).set({ availableSpaceGb }).where(eq(lists.id, row.id));
      }

      // Reemplaza los ítems (el merge lo resuelve el cliente; el backend sólo persiste).
      await tx.delete(listItems).where(eq(listItems.listId, row.id));
      if (list.items.length > 0) {
        await tx.insert(listItems).values(
          list.items.map((i) => ({
            listId: row.id,
            level: i.level,
            audiovisualId: i.level === 'audiovisual' ? i.targetId : null,
            seasonId: i.level === 'season' ? i.targetId : null,
            episodeId: i.level === 'episode' ? i.targetId : null,
            code: i.code,
            name: i.name,
            sizeGb: i.sizeGb,
            price: i.price,
          })),
        );
      }
      return list;
    });
  }

  /** Resuelve el targetId según el nivel poblado (modelo de datos §3.2). */
  private targetId(r: {
    level: string;
    audiovisualId: number | null;
    seasonId: number | null;
    episodeId: number | null;
  }): number {
    if (r.level === 'audiovisual') return r.audiovisualId ?? 0;
    if (r.level === 'season') return r.seasonId ?? 0;
    return r.episodeId ?? 0;
  }
}
