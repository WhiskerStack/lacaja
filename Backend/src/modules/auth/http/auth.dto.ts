import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class UserRegisterDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UserLoginDto {
  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
