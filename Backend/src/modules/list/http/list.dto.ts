import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ListItemDto {
  @IsString()
  code!: string;

  @IsIn(['audiovisual', 'season', 'episode'])
  level!: 'audiovisual' | 'season' | 'episode';

  @IsInt()
  targetId!: number;

  @IsString()
  name!: string;

  @IsNumber()
  sizeGb!: number;

  @IsNumber()
  price!: number;
}

export class SaveListDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListItemDto)
  items!: ListItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  availableSpaceGb?: number;
}
