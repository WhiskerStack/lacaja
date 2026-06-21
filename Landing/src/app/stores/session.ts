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
