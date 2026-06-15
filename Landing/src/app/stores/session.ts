// Store global de sesión (arquitectura §2: stores verdaderamente globales en app/stores/).
// Guarda un DTO plano de usuario, no una instancia (arquitectura §3b.2).
import { persistentAtom } from '@nanostores/persistent';
import type { UserDTO } from '@dahem/domain';

export interface SessionState {
  user: UserDTO | null;
  token: string | null;
}

/** Sesión persistida en localStorage (sobrevive recargas). null = anónimo. */
export const $session = persistentAtom<SessionState>(
  'dahem:session',
  { user: null, token: null },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

export function isLoggedIn(state: SessionState): boolean {
  return Boolean(state.user && state.token);
}

export function setSession(user: UserDTO, token: string): void {
  $session.set({ user, token });
}

export function clearSession(): void {
  $session.set({ user: null, token: null });
}

/** Inicial del usuario para el ícono del navbar (funcional §5.1). */
export function userInitial(user: UserDTO | null): string {
  if (!user) return '';
  return (user.firstName?.[0] ?? '?').toUpperCase();
}

/** Color de fondo determinista a partir del nombre (funcional §5.1). */
export function userColor(user: UserDTO | null): string {
  const palette = ['#e11d48', '#f59e0b', '#22d3ee', '#22c55e', '#a855f7', '#3b82f6'];
  const seed = (user?.firstName ?? '') + (user?.lastName ?? '');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}
