import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { ADMIN_ONLY_KEY, AuthUser, IS_PUBLIC_KEY } from './auth.constants';

/** Marca una ruta como pública: el JwtAuthGuard la deja pasar sin token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restringe la ruta a tokens de audiencia 'admin'. Como no hay roles (modelo de datos §3.1),
 * basta con distinguir admin de cliente: cualquier admin tiene los mismos permisos.
 */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

/** Inyecta el usuario autenticado (puesto por el guard en request.user). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
