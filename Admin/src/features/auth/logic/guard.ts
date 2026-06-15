import { redirect } from '@tanstack/react-router';
import type { AppContainer } from '@/app/container';
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

/** Guard inverso: si ya hay sesión, sacar de /login o /bootstrap al dashboard. */
export function redirectIfAuthed({ context }: { context: RouterContext }) {
  const auth = context.container.resolve<AuthService>('authService');
  if (auth.isAuthenticated()) {
    throw redirect({ to: '/' });
  }
}
