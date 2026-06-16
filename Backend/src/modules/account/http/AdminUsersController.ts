import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Put,
} from '@nestjs/common';
import { AdminOnly } from '../../auth/http/decorators';
import { UserRepository } from '../domain/UserRepository';
import { SetBannedDto, UpdateUserDto } from './account-admin.dto';

/**
 * Gestión de los clientes del sistema (USER) desde el panel: listar, editar,
 * borrar y vetar/reactivar. Sólo admin. El `code` (U{id}) es inmutable.
 */
@AdminOnly()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UserRepository) {}

  @Get()
  async list() {
    const users = await this.users.list();
    return users.map((u) => u.toJSON());
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const updated = await this.users.update(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
    });
    if (!updated) throw new NotFoundException('Usuario no encontrado.');
    return updated.toJSON();
  }

  @Patch(':id/ban')
  async setBanned(@Param('id', ParseIntPipe) id: number, @Body() dto: SetBannedDto) {
    const updated = await this.users.setBanned(id, dto.banned);
    if (!updated) throw new NotFoundException('Usuario no encontrado.');
    return updated.toJSON();
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.users.delete(id);
    if (!deleted) throw new NotFoundException('Usuario no encontrado.');
    return { deleted: true };
  }
}
