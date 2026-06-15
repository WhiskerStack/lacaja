// Store global de estado de red (especificaciones §5.4). Deshabilita acciones que
// requieren backend cuando se está offline.
import { atom } from 'nanostores';

export const $online = atom<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

let wired = false;
/** Conecta los eventos del navegador al store. Idempotente. */
export function wireNetworkStatus(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  const update = () => $online.set(navigator.onLine);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}
