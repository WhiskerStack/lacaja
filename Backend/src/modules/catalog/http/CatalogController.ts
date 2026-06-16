import { Audiovisual } from '@dahem/domain';
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CatalogService } from '../application/CatalogService';
import { CatalogExportService } from '../infrastructure/CatalogExportService';
import { Public } from '../../auth/http/decorators';
import { SearchCatalogDto } from './catalog.dto';

/** Mapea dominio → DTO de respuesta (incluye el code calculado). */
export function toResponse(a: Audiovisual) {
  return { ...a.toRow(), code: a.code(), isEpisodic: a.isEpisodic() };
}

/** Lectura pública del catálogo (landing/admin). El servicio es dueño del Criteria. */
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly service: CatalogService,
    private readonly exportService: CatalogExportService,
  ) {}

  @Public()
  @Get()
  async search(@Query() q: SearchCatalogDto) {
    const { items, total } = await this.service.search(q); // pasa la intención validada, NO un Criteria
    return { total, items: items.map(toResponse) };
  }

  /**
   * Volcado COMPLETO del catálogo para el SSG del Landing (build-time). Declarado ANTES de
   * `:id` para que la ruta estática gane al parámetro.
   */
  @Public()
  @Get('export')
  async export() {
    return this.exportService.export();
  }

  @Public()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const found = await this.service.findById(id);
    const [seasons, trailers, cast] = await Promise.all([
      found.isEpisodic() ? this.service.meta.seasonsOf(id) : Promise.resolve([]),
      this.service.meta.trailersOf(id),
      this.service.meta.castOf(id),
    ]);
    return { ...toResponse(found), seasons, trailers, cast };
  }
}
