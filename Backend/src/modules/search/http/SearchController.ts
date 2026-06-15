import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Public } from '../../auth/http/decorators';
import { SearchService } from '../application/SearchService';

class SearchDto {
  @IsOptional()
  @IsString()
  q?: string;
}

/** Búsqueda pública del catálogo (landing). GET /search y /search/suggest. */
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Public()
  @Get()
  async search(@Query() dto: SearchDto) {
    const results = await this.service.search(dto.q ?? '');
    return { routing: this.service.route(dto.q ?? ''), results };
  }

  @Public()
  @Get('suggest')
  async suggest(@Query() dto: SearchDto) {
    return { results: await this.service.suggest(dto.q ?? '') };
  }
}
