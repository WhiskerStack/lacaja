// Botonera inferior, solo móvil (funcional §5.2). En desktop se oculta (md:hidden).
import { useStore } from '@nanostores/preact';
import { openDrawer } from '../../features/my-list/store';
import { useList } from '../../features/my-list/ui/useList';
import { $list } from '../../features/my-list/store';

export default function BottomBar() {
  useList(); // asegura hidratación
  const list = useStore($list);
  const count = list?.count ?? null;

  return (
    <nav class="btm-nav md:hidden z-40 border-t border-base-300">
      <a href="/" aria-label="Inicio">
        <span aria-hidden>🏠</span>
        <span class="btm-nav-label text-xs">Inicio</span>
      </a>
      <a href="/biblioteca" aria-label="Biblioteca">
        <span aria-hidden>🗂️</span>
        <span class="btm-nav-label text-xs">Biblioteca</span>
      </a>
      <a href="/buscar" aria-label="Buscar">
        <span aria-hidden>🔍</span>
        <span class="btm-nav-label text-xs">Buscar</span>
      </a>
      <button type="button" aria-label="Mi lista" onClick={openDrawer}>
        <div class="indicator">
          <span aria-hidden>🛒</span>
          {count !== null && count > 0 && (
            <span class="badge badge-primary badge-xs indicator-item">{count}</span>
          )}
        </div>
        <span class="btm-nav-label text-xs">Mi lista</span>
      </button>
    </nav>
  );
}
