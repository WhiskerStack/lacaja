import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { AdminAccountsController } from './http/AdminAccountsController';

/**
 * Cuentas del panel admin. AuthService y AdminUserRepository vienen del AuthModule global,
 * así que aquí sólo se monta el controller (bootstrap/list/create).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AdminAccountsController],
})
export class AdminModule {}
