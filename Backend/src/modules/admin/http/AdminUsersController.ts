import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../../auth/application/AuthService';
import { AdminOnly, Public } from '../../auth/http/decorators';
import { AdminUserRepository } from '../domain/AdminUserRepository';
import { CreateAdminDto } from './admin.dto';

/** Cuentas del panel admin: bootstrap del primero, listar y crear desde dentro. */
@Controller('admin')
export class AdminUsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly admins: AdminUserRepository,
  ) {}

  /** Indica si aún se puede hacer bootstrap (no hay ningún admin). Público: lo consulta el login. */
  @Public()
  @Get('bootstrap-status')
  async bootstrapStatus() {
    const count = await this.admins.count();
    return { needsBootstrap: count === 0 };
  }

  /** Bootstrap: público pero sólo funciona mientras NO exista ningún admin (AuthService valida). */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('bootstrap')
  async bootstrap(@Body() dto: CreateAdminDto) {
    const { admin, token } = await this.auth.bootstrapAdmin(
      dto.username,
      dto.password,
      dto.displayName,
    );
    return { admin: admin.toJSON(), ...token };
  }

  @AdminOnly()
  @Get('users')
  async list() {
    const users = await this.admins.list();
    return users.map((u) => u.toJSON());
  }

  @AdminOnly()
  @Post('users')
  async create(@Body() dto: CreateAdminDto) {
    const { admin } = await this.auth.createAdmin(dto.username, dto.password, dto.displayName);
    return admin.toJSON();
  }
}
