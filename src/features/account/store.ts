// Store del slice account: controla la apertura del modal de login/registro desde
// múltiples lugares (navbar, envío por web, solicitar contenido) — funcional §4.3.
import { atom } from 'nanostores';
import type { AuthMode } from './types';

export interface AuthModalState {
  open: boolean;
  mode: AuthMode;
  /** Mensaje contextual: por qué se pide la cuenta (p.ej. "para enviar por la web"). */
  reason?: string;
  /** Acción a ejecutar tras autenticarse correctamente. */
  onSuccess?: () => void;
}

export const $authModal = atom<AuthModalState>({ open: false, mode: 'login' });

export function openAuthModal(opts: Partial<AuthModalState> = {}): void {
  $authModal.set({ open: true, mode: opts.mode ?? 'login', reason: opts.reason, onSuccess: opts.onSuccess });
}

export function closeAuthModal(): void {
  $authModal.set({ ...$authModal.get(), open: false, onSuccess: undefined });
}
