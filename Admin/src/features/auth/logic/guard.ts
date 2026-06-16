import { redirect } from '@tanstack/react-router';
import type { AppContainer } from '@/app/container';
import type { AuthApi } from '../api/AuthApi';
import type { AuthService } from './AuthService';

/** Contexto que el router inyecta a cada ruta (incluye el contenedor IoC). */
export interface RouterContext {
  container: AppContainer;
}

/**
 * Guard de rutas protegidas: valida que exista sesión antes de entrar.
 * Reemplaza al guard de Clerk; usa el token propio emitido por NestJS.
 * Se usa en el `beforeLoad` de la layout protegida.
 */
export function requireAuth({ context, location }: { context: RouterContext; location: { href: string } }) {
  const auth = context.container.resolve<AuthService>('authService');
  if (!auth.isAuthenticated()) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    });
  }
}

/** ¿Sigue disponible el bootstrap? (no hay admin). Tolera fallos de red: ante error, asume que sí hay admin. */
async function needsBootstrap(container: AppContainer): Promise<boolean> {
  const authApi = container.resolve<AuthApi>('authApi');
  try {
    const { needsBootstrap } = await authApi.bootstrapStatus();
    return needsBootstrap;
  } catch {
    return false;
  }
}

/**
 * Guard de /login: si ya hay sesión va al dashboard; si aún NO existe ningún
 * admin, manda a crear la cuenta inicial (/bootstrap).
 */
export async function loginGuard({ context }: { context: RouterContext }) {
  const auth = context.container.resolve<AuthService>('authService');
  if (auth.isAuthenticated()) throw redirect({ to: '/' });
  if (await needsBootstrap(context.container)) throw redirect({ to: '/bootstrap' });
}

/**
 * Guard de /bootstrap: si ya hay sesión va al dashboard; si YA existe algún
 * admin, no hay bootstrap que hacer y manda al login.
 */
export async function bootstrapGuard({ context }: { context: RouterContext }) {
  const auth = context.container.resolve<AuthService>('authService');
  if (auth.isAuthenticated()) throw redirect({ to: '/' });
  if (!(await needsBootstrap(context.container)))
    throw redirect({ to: '/login', search: { redirect: undefined } });
}
