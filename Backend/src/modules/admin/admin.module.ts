import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { AdminUsersController } from './http/AdminUsersController';

/**
 * Cuentas del panel admin. AuthService y AdminUserRepository vienen del AuthModule global,
 * así que aquí sólo se monta el controller (bootstrap/list/create).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AdminUsersController],
})
export class AdminModule {}
