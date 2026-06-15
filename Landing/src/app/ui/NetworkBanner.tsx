// Indicador discreto de estado offline (especificaciones §5.4). También arranca la detección
// de red y la precarga del índice de búsqueda en idle (especificaciones §4.2).
import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $online, wireNetworkStatus } from '../stores/network';
import { searchService } from '../container';

export default function NetworkBanner() {
  const online = useStore($online);

  useEffect(() => {
    wireNetworkStatus();
    // Precarga del índice en idle, sin esperar a que el usuario entre a Buscar.
    const idle = (cb: () => void) =>
      'requestIdleCallback' in window
        ? (window as any).requestIdleCallback(cb)
        : setTimeout(cb, 1200);
    idle(() => void searchService.loadIndex());
  }, []);

  if (online) return null;
  return (
    <div class="bg-warning text-warning-content text-center text-sm py-1 px-2" role="status">
      Estás sin conexión. Puedes seguir explorando y usar WhatsApp, TXT o copiar.
    </div>
  );
}
