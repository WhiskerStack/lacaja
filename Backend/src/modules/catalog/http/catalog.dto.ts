import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const TYPES = ['movie', 'series', 'telenovela', 'show', 'anime'] as const;

export class SearchCatalogDto {
  @IsOptional()
  @IsIn(TYPES)
  type?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPremiere?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class UpsertAudiovisualDto {
  @IsIn(TYPES)
  type!: (typeof TYPES)[number];

  @IsString()
  name!: string;

  @IsInt()
  year!: number;

  @IsNumber()
  rating!: number;

  @IsOptional()
  @IsNumber()
  sizeGb?: number;

  @IsOptional()
  @IsBoolean()
  isPremiere?: boolean;
}

export class NamedDto {
  @IsString()
  name!: string;
}

export class CreateSeasonDto {
  @IsInt()
  number!: number;

  @IsOptional()
  @IsNumber()
  sizeGb?: number;
}

export class CreateEpisodeDto {
  @IsInt()
  number!: number;

  @IsOptional()
  @IsNumber()
  sizeGb?: number;

  @IsOptional()
  @IsInt()
  durationMin?: number;
}

export class CreateTrailerDto {
  @IsString()
  youtubeId!: string;
}

export class LinkCastDto {
  @IsInt()
  castMemberId!: number;
}

// --- Importación masiva desde el inventario físico (SearchEngine) ---

export class ImportEpisodeDto {
  @IsInt()
  number!: number;

  @IsOptional()
  @IsNumber()
  sizeGb?: number;

  @IsOptional()
  @IsInt()
  durationMin?: number;
}

export class ImportSeasonDto {
  @IsInt()
  number!: number;

  @IsOptional()
  @IsNumber()
  sizeGb?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportEpisodeDto)
  episodes?: ImportEpisodeDto[];
}

export class ImportItemDto {
  /** Código físico del inventario (P1, S2...). Clave de deduplicación. */
  @IsString()
  code!: string;

  @IsIn(TYPES)
  type!: (typeof TYPES)[number];

  /** Nombre mostrado en el catálogo (español). */
  @IsString()
  name!: string;

  @IsInt()
  year!: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  sizeGb?: number;

  @IsOptional()
  @IsBoolean()
  isPremiere?: boolean;

  @IsOptional()
  @IsInt()
  durationMin?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  /** Nombre del género (se resuelve a genreId; se crea si no existe). */
  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportSeasonDto)
  seasons?: ImportSeasonDto[];
}

export class ImportCatalogDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportItemDto)
  items!: ImportItemDto[];
}
