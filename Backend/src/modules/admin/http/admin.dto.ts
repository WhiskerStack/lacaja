import { IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  displayName!: string;
}
