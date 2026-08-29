// Hook que mantiene el snapshot de la lista hidratado desde Dexie y suscrito al store.
// Lo usan el badge del navbar, el drawer y el botón "Agregar".
import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $list, setListSnapshot } from '../store';
import { listService } from '../../../app/container';

let hydrated = false;

/** Hidrata la lista una sola vez por sesión de página y devuelve el snapshot reactivo. */
export function useList() {
  const snapshot = useStore($list);

  useEffect(() => {
    if (hydrated) return;
    hydrated = true;
    listService.snapshot().then(setListSnapshot).catch(() => setListSnapshot({
      items: [], totalGb: 0, totalPrice: 0, count: 0, availableSpaceGb: null,
    }));
  }, []);

  return snapshot;
}

/** Refresca el snapshot tras una mutación. */
export async function refreshList(): Promise<void> {
  const snap = await listService.snapshot();
  setListSnapshot(snap);
}
