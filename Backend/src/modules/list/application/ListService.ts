import { List, ListItem, type ItemLevel } from '@dahem/domain';
import { Injectable } from '@nestjs/common';
import { ListRepository } from '../domain/ListRepository';

export interface ListItemInput {
  code: string;
  level: ItemLevel;
  targetId: number;
  name: string;
  sizeGb: number;
  price: number;
}

/** Persiste "Mi lista" del usuario logueado. El merge lo hace el cliente; el backend almacena. */
@Injectable()
export class ListService {
  constructor(private readonly repo: ListRepository) {}

  get(userId: number): Promise<List> {
    return this.repo.findByUser(userId);
  }

  save(userId: number, items: ListItemInput[], availableSpaceGb?: number): Promise<List> {
    const list = new List(
      items.map((i) => new ListItem(i.code, i.level, i.targetId, i.name, i.sizeGb, i.price)),
    );
    return this.repo.replace(userId, list, availableSpaceGb);
  }
}
