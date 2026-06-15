import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { AccountController } from './http/AccountController';

/**
 * Registro/login del cliente USER. El AuthService y el UserRepository vienen del
 * AuthModule global (que los cablea y exporta), así que aquí sólo se monta el controller.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AccountController],
})
export class AccountModule {}
