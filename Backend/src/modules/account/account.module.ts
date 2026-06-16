import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { AccountController } from './http/AccountController';
import { AdminUsersController } from './http/AdminUsersController';

/**
 * Registro/login del cliente USER y su gestión desde el panel admin. El AuthService y el
 * UserRepository vienen del AuthModule global (que los cablea y exporta), así que aquí
 * sólo se montan los controllers.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AccountController, AdminUsersController],
})
export class AccountModule {}
