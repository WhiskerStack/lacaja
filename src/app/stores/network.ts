// Store global de estado de red (especificaciones §5.4). Deshabilita acciones que
// requieren backend cuando se está offline.
import { atom } from 'nanostores';

// Optimista por defecto: `navigator.onLine` no es fiable (algunos navegadores reportan
// `false` con red activa, mostrando un banner de "sin conexión" falso). Solo bajamos a
// offline cuando el navegador EMITE un evento `offline` real.
export const $online = atom<boolean>(true);

let wired = false;
/** Conecta los eventos del navegador al store. Idempotente. */
export function wireNetworkStatus(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('online', () => $online.set(true));
  window.addEventListener('offline', () => $online.set(false));
}
