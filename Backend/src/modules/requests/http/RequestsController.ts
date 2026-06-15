import { type RequestStatus } from '@dahem/domain';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { AuthUser } from '../../auth/http/auth.constants';
import { AdminOnly, CurrentUser } from '../../auth/http/decorators';
import { RequestsService } from '../application/RequestsService';

class CreateRequestDto {
  @IsString()
  searchText!: string;
}

class UpdateStatusDto {
  @IsIn(['pending', 'available', 'notified'])
  status!: RequestStatus;
}

class ListRequestsDto {
  @IsOptional()
  @IsIn(['pending', 'available', 'notified'])
  status?: RequestStatus;
}

@Controller()
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  /** El cliente logueado registra una solicitud. */
  @Post('requests')
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    const created = await this.service.create(user.id, dto.searchText);
    return created.toJSON();
  }

  @AdminOnly()
  @Get('admin/requests')
  async list(@Query() dto: ListRequestsDto) {
    const items = await this.service.list(dto.status);
    return items.map((r) => r.toJSON());
  }

  @AdminOnly()
  @Patch('admin/requests/:id/status')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    const updated = await this.service.updateStatus(id, dto.status);
    return updated.toJSON();
  }
}
