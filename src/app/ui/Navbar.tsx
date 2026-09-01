import { useStore } from '@nanostores/preact';
import { Clapperboard, Bookmark, Share2 } from 'lucide-preact';
import { $drawerOpen, openDrawer } from '../../features/my-list/store';
import { useList } from '../../features/my-list/ui/useList';
import { pushToast } from '../stores/toast';
import { isActivePath } from './nav';

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/buscar', label: 'Buscar' },
];

interface Props {
  /** Ruta actual, inyectada por el layout en build (SSG) para resaltar la sección. */
  pathname?: string;
}

export default function Navbar({ pathname = '/' }: Props) {
  const list = useList();
  const count = list?.count ?? null;
  const drawerOpen = useStore($drawerOpen);

  async function shareUrl() {
    const url = window.location.href;
    const title = document.title || 'La Caja — Catálogo audiovisual';
    // Intenta usar la Web Share API (nativa en móviles/PWA)
    if (navigator.share) {
      try {
        await navigator.share({ title, text: 'Mira esto en La Caja', url });
        return;
      } catch (e) {
        // Si el usuario cancela o falla, no hacemos nada (no mostrar error)
        if ((e as Error).name !== 'AbortError') {
          console.warn('Web Share falló, usando copia de respaldo', e);
        } else {
          return; // Usuario canceló
        }
      }
    }
    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(url);
      pushToast({ message: 'Enlace copiado al portapapeles', durationMs: 3000 });
    } catch {
      // Fallback antiguo
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      pushToast({ message: 'Enlace copiado al portapapeles', durationMs: 3000 });
    }
  }

  return (
    <header class="navbar bg-base-200 sticky top-0 z-50 border-b border-base-300">
      <div class="navbar-start">
        <a href="/" class="btn btn-ghost text-xl font-bold gap-2">
          <Clapperboard class="text-primary" size={24} aria-hidden /> La Caja
        </a>
      </div>

      <nav class="navbar-center hidden md:flex">
        <ul class="menu menu-horizontal gap-1">
          {NAV.map((n) => {
            const active = isActivePath(n.href, pathname);
            return (
              <li key={n.href}>
                <a href={n.href} class={active ? 'active font-semibold' : ''} aria-current={active ? 'page' : undefined}>
                  {n.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div class="navbar-end gap-1">
        {/* Botón compartir mejorado */}
        <button
          type="button"
          class="btn btn-ghost btn-circle"
          aria-label="Compartir enlace"
          onClick={shareUrl}
        >
          <Share2 size={20} aria-hidden />
        </button>

        <button
          type="button"
          class={`btn btn-circle ${drawerOpen ? 'btn-active text-primary' : 'btn-ghost'}`}
          aria-label="Mi lista"
          aria-expanded={drawerOpen}
          onClick={openDrawer}
        >
          <div class="indicator">
            <Bookmark size={20} aria-hidden />
            {count !== null && count > 0 && (
              <span class="badge badge-primary badge-sm indicator-item">{count}</span>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}