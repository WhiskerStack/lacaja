import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../../auth/http/decorators';
import type { AuthUser } from '../../auth/http/auth.constants';
import { ListService } from '../application/ListService';
import { SaveListDto } from './list.dto';

/** "Mi lista" persistida del USER logueado. Requiere auth (no @Public). */
@Controller('list')
export class ListController {
  constructor(private readonly service: ListService) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    const list = await this.service.get(user.id);
    return { items: list.toJSON(), totalGb: list.totalGb(), totalPrice: list.totalPrice() };
  }

  @Put()
  async save(@CurrentUser() user: AuthUser, @Body() dto: SaveListDto) {
    const list = await this.service.save(user.id, dto.items, dto.availableSpaceGb);
    return { items: list.toJSON(), totalGb: list.totalGb(), totalPrice: list.totalPrice() };
  }
}
