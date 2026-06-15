import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import {
  ADMIN_ONLY_KEY,
  AuthUser,
  IS_PUBLIC_KEY,
  JwtPayload,
} from './auth.constants';

/**
 * Guard global de autenticación. Verifica el JWT salvo en rutas @Public(), y exige
 * audiencia 'admin' en rutas @AdminOnly(). Pone el usuario en request.user para @CurrentUser().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Falta el token de autenticación.');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    const user: AuthUser = {
      id: payload.sub,
      audience: payload.aud,
      username: payload.username,
    };
    (request as Request & { user: AuthUser }).user = user;

    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (adminOnly && user.audience !== 'admin') {
      throw new ForbiddenException('Se requiere una cuenta de administrador.');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
