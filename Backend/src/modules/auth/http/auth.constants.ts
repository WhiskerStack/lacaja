/** Audiencia del token: separa el operador del panel (admin) del cliente del landing (user). */
export type AuthAudience = 'admin' | 'user';

/** Payload que viaja dentro del JWT. */
export interface JwtPayload {
  sub: number; // id del usuario/admin
  username?: string; // sólo admin
  aud: AuthAudience;
}

/** Usuario autenticado expuesto por @CurrentUser(). */
export interface AuthUser {
  id: number;
  audience: AuthAudience;
  username?: string;
}

export const IS_PUBLIC_KEY = 'isPublic';
export const ADMIN_ONLY_KEY = 'adminOnly';
