import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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
