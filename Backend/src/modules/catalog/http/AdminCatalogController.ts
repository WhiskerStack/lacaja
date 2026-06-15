import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CatalogService } from '../application/CatalogService';
import { AdminOnly } from '../../auth/http/decorators';
import {
  CreateEpisodeDto,
  CreateSeasonDto,
  CreateTrailerDto,
  LinkCastDto,
  NamedDto,
  UpsertAudiovisualDto,
} from './catalog.dto';
import { toResponse } from './CatalogController';

/**
 * CRUD del catálogo y gestión de metadatos, sólo para admin (@AdminOnly).
 * Géneros, regiones, idiomas, reparto, trailers y jerarquía episódica bajo /admin.
 */
@AdminOnly()
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly service: CatalogService) {}

  // --- Audiovisuales ---
  @Post()
  async create(@Body() dto: UpsertAudiovisualDto) {
    return toResponse(await this.service.create(dto));
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertAudiovisualDto) {
    return toResponse(await this.service.update(id, dto));
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
    return { deleted: true };
  }

  // --- Catálogos de filtrado ---
  @Get('genres')
  genres() {
    return this.service.meta.listGenres();
  }
  @Post('genres')
  createGenre(@Body() dto: NamedDto) {
    return this.service.meta.createGenre(dto.name);
  }
  @Delete('genres/:id')
  deleteGenre(@Param('id', ParseIntPipe) id: number) {
    return this.service.meta.deleteGenre(id);
  }

  @Get('regions')
  regions() {
    return this.service.meta.listRegions();
  }
  @Post('regions')
  createRegion(@Body() dto: NamedDto) {
    return this.service.meta.createRegion(dto.name);
  }
  @Delete('regions/:id')
  deleteRegion(@Param('id', ParseIntPipe) id: number) {
    return this.service.meta.deleteRegion(id);
  }

  @Get('languages')
  languages() {
    return this.service.meta.listLanguages();
  }
  @Post('languages')
  createLanguage(@Body() dto: NamedDto) {
    return this.service.meta.createLanguage(dto.name);
  }
  @Delete('languages/:id')
  deleteLanguage(@Param('id', ParseIntPipe) id: number) {
    return this.service.meta.deleteLanguage(id);
  }

  // --- Reparto ---
  @Get('cast')
  cast() {
    return this.service.meta.listCast();
  }
  @Post('cast')
  createCast(@Body() dto: NamedDto) {
    return this.service.meta.createCastMember(dto.name);
  }
  @Delete('cast/:id')
  deleteCast(@Param('id', ParseIntPipe) id: number) {
    return this.service.meta.deleteCastMember(id);
  }
  @Post(':id/cast')
  linkCast(@Param('id', ParseIntPipe) id: number, @Body() dto: LinkCastDto) {
    return this.service.meta.linkCast(id, dto.castMemberId);
  }

  // --- Trailers ---
  @Post(':id/trailers')
  createTrailer(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTrailerDto) {
    return this.service.meta.createTrailer(id, dto.youtubeId);
  }
  @Delete('trailers/:id')
  deleteTrailer(@Param('id', ParseIntPipe) id: number) {
    return this.service.meta.deleteTrailer(id);
  }

  // --- Jerarquía episódica ---
  @Post(':id/seasons')
  createSeason(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSeasonDto) {
    return this.service.meta.createSeason(id, dto.number, dto.sizeGb ?? 0);
  }
  @Delete('seasons/:id')
  deleteSeason(@Param('id', ParseIntPipe) id: number) {
    return this.service.meta.deleteSeason(id);
  }
  @Post('seasons/:id/episodes')
  createEpisode(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEpisodeDto) {
    return this.service.meta.createEpisode(id, dto.number, dto.sizeGb ?? 0, dto.durationMin);
  }
  @Delete('episodes/:id')
  deleteEpisode(@Param('id', ParseIntPipe) id: number) {
    return this.service.meta.deleteEpisode(id);
  }
}
