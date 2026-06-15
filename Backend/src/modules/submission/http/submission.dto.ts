import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SubmissionItemDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsNumber()
  sizeGb!: number;

  @IsOptional()
  @IsBoolean()
  isPremiere?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreateSubmissionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionItemDto)
  items!: SubmissionItemDto[];

  /** Permite que el admin/landing envíe en nombre de un USER ya creado. */
  @IsOptional()
  @IsInt()
  userId?: number;
}
