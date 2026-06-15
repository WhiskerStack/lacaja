import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation';

/**
 * Configuración tipada (stack §8): carga .env y valida la presencia de DATABASE_URL
 * y JWT_SECRET al arrancar. @Global vía isGlobal para inyectar ConfigService en cualquier sitio.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
