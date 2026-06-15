// Store de toasts global (incluye el "Deshacer" de Mi lista, funcional §7.2).
import { atom } from 'nanostores';

export interface Toast {
  id: number;
  message: string;
  /** Etiqueta de acción opcional (p.ej. "Deshacer"). */
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

export const $toasts = atom<Toast[]>([]);

let seq = 1;

export function pushToast(toast: Omit<Toast, 'id'>): number {
  const id = seq++;
  $toasts.set([...$toasts.get(), { ...toast, id }]);
  if (toast.durationMs > 0) {
    setTimeout(() => dismissToast(id), toast.durationMs);
  }
  return id;
}

export function dismissToast(id: number): void {
  $toasts.set($toasts.get().filter((t) => t.id !== id));
}
