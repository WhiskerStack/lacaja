import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/** Edición de un cliente desde el panel (code e id son inmutables, no se aceptan). */
export class UpdateUserDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

/** Veta o reactiva un cliente. */
export class SetBannedDto {
  @IsBoolean()
  banned!: boolean;
}
