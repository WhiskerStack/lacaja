import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UserRepository } from '../account/domain/UserRepository';
import { DrizzleUserRepository } from '../account/infrastructure/DrizzleUserRepository';
import { AdminUserRepository } from '../admin/domain/AdminUserRepository';
import { DrizzleAdminUserRepository } from '../admin/infrastructure/DrizzleAdminUserRepository';
import { AuthService } from './application/AuthService';
import { PasswordHasher } from './application/PasswordHasher';
import { AuthController } from './http/AuthController';
import { JwtAuthGuard } from './http/JwtAuthGuard';

/**
 * Módulo transversal de auth (@Global): emite/verifica JWT y aplica el guard a TODAS las rutas.
 * Cablea aquí los puertos de cuentas (admin/user) usados por el AuthService, y los exporta para
 * que admin/account los reutilicen sin duplicar el binding.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    { provide: AdminUserRepository, useClass: DrizzleAdminUserRepository },
    { provide: UserRepository, useClass: DrizzleUserRepository },
    // Guard global: protege por defecto; las rutas públicas se marcan con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, PasswordHasher, JwtModule, AdminUserRepository, UserRepository],
})
export class AuthModule {}
