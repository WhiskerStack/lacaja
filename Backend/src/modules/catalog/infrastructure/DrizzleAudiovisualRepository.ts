import { Audiovisual, audiovisualCode } from '@daher/domain';
import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { Criteria } from '../../../shared/criteria/Criteria';
import {
  CriteriaToDrizzleTransformer,
  type FieldMap,
} from '../../../shared/criteria/CriteriaToDrizzleTransformer';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { AudiovisualRepository } from '../domain/AudiovisualRepository';
import { audiovisuals } from './catalog.schema';

/**
 * Allowlist (arquitectura §5.3): solo estos campos son consultables desde fuera, aunque
 * la tabla tenga más columnas (description, FKs internas, search_vector). Las FKs y el
 * hash quedan fuera a propósito: es la mitigación de inyección/sobreexposición por campo.
 */
const AUDIOVISUAL_FIELDS: FieldMap = {
  id: audiovisuals.id,
  type: audiovisuals.type,
  name: audiovisuals.name,
  year: audiovisuals.year,
  rating: audiovisuals.rating,
  sizeGb: audiovisuals.sizeGb,
  isPremiere: audiovisuals.isPremiere,
  code: audiovisuals.code,
};

@Injectable()
export class DrizzleAudiovisualRepository extends AudiovisualRepository {
  private readonly transformer = new CriteriaToDrizzleTransformer(AUDIOVISUAL_FIELDS);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async match(criteria: Criteria): Promise<Audiovisual[]> {
    const { where, orderBy, limit, offset } = this.transformer.transform(criteria);
    let query = this.db.select().from(audiovisuals).$dynamic();
    if (where) query = query.where(where);
    if (orderBy.length) query = query.orderBy(...orderBy);
    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);
    const rows = await query;
    return rows.map((r) => Audiovisual.fromRow(r)); // hidratar en la frontera (BD → dominio)
  }

  async count(criteria: Criteria): Promise<number> {
    const { where } = this.transformer.transform(criteria);
    let query = this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(audiovisuals)
      .$dynamic();
    if (where) query = query.where(where);
    const [row] = await query;
    return row?.value ?? 0;
  }

  async findById(id: number): Promise<Audiovisual | null> {
    const [row] = await this.db
      .select()
      .from(audiovisuals)
      .where(eq(audiovisuals.id, id))
      .limit(1);
    return row ? Audiovisual.fromRow(row) : null;
  }

  async save(entity: Audiovisual): Promise<Audiovisual> {
    // El dominio Audiovisual sólo lleva los 7 campos núcleo; los metadatos extra
    // (description, FKs) se editan por endpoints específicos. Aquí persistimos el núcleo
    // + el code materializado para la búsqueda por código.
    const row = entity.toRow();
    const core = {
      type: row.type,
      name: row.name,
      year: row.year,
      rating: row.rating,
      sizeGb: row.sizeGb,
      isPremiere: row.isPremiere,
    };

    // Alta (id ausente o 0): deja que el serial genere el id y luego materializa el code.
    if (!entity.id) {
      const [inserted] = await this.db.insert(audiovisuals).values(core).returning();
      const code = audiovisualCode(inserted.type as Audiovisual['type'], inserted.id);
      const [saved] = await this.db
        .update(audiovisuals)
        .set({ code })
        .where(eq(audiovisuals.id, inserted.id))
        .returning();
      return Audiovisual.fromRow(saved);
    }

    // Actualización (id conocido): upsert con code derivado del id.
    const code = audiovisualCode(entity.type, entity.id);
    const [saved] = await this.db
      .insert(audiovisuals)
      .values({ ...core, id: entity.id, code })
      .onConflictDoUpdate({ target: audiovisuals.id, set: { ...core, code } })
      .returning();
    return Audiovisual.fromRow(saved);
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(audiovisuals).where(eq(audiovisuals.id, id));
  }
}
