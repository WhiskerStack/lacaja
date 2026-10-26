// Botonera inferior, solo móvil (funcional §5.2). En desktop se oculta (md:hidden).
import { useStore } from '@nanostores/preact';
import { Home, Library, Search, Bookmark } from 'lucide-preact';
import { $drawerOpen, openDrawer } from '../../features/my-list/store';
import { useList } from '../../features/my-list/ui/useList';
import { $list } from '../../features/my-list/store';
import { isActivePath } from './nav';
import { withBase } from '../../shared/urls';

const NAV = [
  { href: '/', label: 'Inicio', Icon: Home },
  { href: '/biblioteca', label: 'Biblioteca', Icon: Library },
  { href: '/buscar', label: 'Buscar', Icon: Search },
];

interface Props {
  /** Ruta actual, inyectada por el layout en build (SSG) para resaltar la sección. */
  pathname?: string;
}

export default function BottomBar({ pathname = '/' }: Props) {
  useList(); // asegura hidratación
  const list = useStore($list);
  const count = list?.count ?? null;
  const drawerOpen = useStore($drawerOpen);

  return (
    <nav class="btm-nav md:hidden z-40 border-t border-base-300">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActivePath(href, pathname);
        return (
          <a
            key={href}
            href={withBase(href)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            class={active ? 'active text-primary' : ''}
          >
            <Icon size={20} aria-hidden />
            <span class="btm-nav-label text-xs">{label}</span>
          </a>
        );
      })}
      <button
        type="button"
        aria-label="Mi lista"
        aria-expanded={drawerOpen}
        class={drawerOpen ? 'active text-primary' : ''}
        onClick={openDrawer}
      >
        <div class="indicator">
          <Bookmark size={20} aria-hidden />
          {count !== null && count > 0 && (
            <span class="badge badge-primary badge-xs indicator-item">{count}</span>
          )}
        </div>
        <span class="btm-nav-label text-xs">Mi lista</span>
      </button>
    </nav>
  );
}
