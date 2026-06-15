import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import type { AuthUser } from '../../auth/http/auth.constants';
import { AdminOnly, CurrentUser } from '../../auth/http/decorators';
import { SubmissionService } from '../application/SubmissionService';
import { CreateSubmissionDto } from './submission.dto';

class ListSubmissionsDto {
  @IsOptional()
  @IsString()
  search?: string;
}

@Controller()
export class SubmissionController {
  constructor(private readonly service: SubmissionService) {}

  /** El cliente logueado envía su lista por web (snapshot congelado). */
  @Post('submission')
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubmissionDto) {
    const submission = await this.service.create(dto.userId ?? user.id, dto.items);
    return submission.toJSON();
  }

  @AdminOnly()
  @Get('admin/submissions')
  async list(@Query() dto: ListSubmissionsDto) {
    const items = await this.service.list(dto.search);
    return items.map((s) => s.toJSON());
  }

  @AdminOnly()
  @Get('admin/submissions/:id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const submission = await this.service.findById(id);
    return submission.toJSON();
  }
}
