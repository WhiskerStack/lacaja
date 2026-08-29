// Store de toasts global (incluye el "Deshacer" de Mi lista, funcional §7.2).
import { atom } from 'nanostores';
import { messageFromError } from '../../shared/message-from-error';

/** Estilo del toast → clase DaisyUI (alert-info/success/error/warning). */
export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  /** Etiqueta de acción opcional (p.ej. "Deshacer"). */
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

export const $toasts = atom<Toast[]>([]);

let seq = 1;

export function pushToast(toast: Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }): number {
  const id = seq++;
  $toasts.set([...$toasts.get(), { variant: 'info', ...toast, id }]);
  if (toast.durationMs > 0) {
    setTimeout(() => dismissToast(id), toast.durationMs);
  }
  return id;
}

/**
 * Muestra un toast de error con el mensaje extraído del body de la respuesta (o de cualquier
 * valor lanzado). Punto único para reportar fallos al usuario con detalle.
 */
export function toastError(err: unknown, durationMs = 7000): number {
  return pushToast({ message: messageFromError(err), variant: 'error', durationMs });
}

export function dismissToast(id: number): void {
  $toasts.set($toasts.get().filter((t) => t.id !== id));
}
