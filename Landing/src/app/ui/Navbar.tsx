// Navbar (client:load): logo, navegación desktop, ícono de usuario y badge de Mi lista.
// El badge usa placeholder neutro hasta hidratar para evitar el flash de "0" (especificaciones §8.4).
import { useStore } from '@nanostores/preact';
import { $session, userColor, userInitial, isLoggedIn } from '../stores/session';
import { openAuthModal } from '../../features/account/store';
import { openDrawer } from '../../features/my-list/store';
import { useList } from '../../features/my-list/ui/useList';

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/buscar', label: 'Buscar' },
];

export default function Navbar() {
  const session = useStore($session);
  const list = useList();
  const logged = isLoggedIn(session);
  // list === null → aún no hidratado: badge neutro (sin número).
  const count = list?.count ?? null;

  return (
    <header class="navbar bg-base-200/80 backdrop-blur sticky top-0 z-50 border-b border-base-300">
      <div class="navbar-start">
        <a href="/" class="btn btn-ghost text-xl font-bold gap-2">
          <span class="text-primary">●</span> Dahem
        </a>
      </div>

      <nav class="navbar-center hidden md:flex">
        <ul class="menu menu-horizontal gap-1">
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href}>{n.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div class="navbar-end gap-1">
        {/* Mi lista */}
        <button type="button" class="btn btn-ghost btn-circle" aria-label="Mi lista" onClick={openDrawer}>
          <div class="indicator">
            <span aria-hidden>🛒</span>
            {count !== null && count > 0 && (
              <span class="badge badge-primary badge-sm indicator-item">{count}</span>
            )}
          </div>
        </button>

        {/* Usuario */}
        {logged && session.user ? (
          <button
            type="button"
            class="btn btn-circle text-sm font-bold"
            style={{ backgroundColor: userColor(session.user), color: '#fff' }}
            aria-label={`Sesión de ${session.user.firstName}`}
            onClick={() => openAuthModal({ reason: 'Tu cuenta' })}
          >
            {userInitial(session.user)}
          </button>
        ) : (
          <button
            type="button"
            class="btn btn-ghost btn-circle"
            aria-label="Iniciar sesión"
            onClick={() => openAuthModal()}
          >
            <span aria-hidden>👤</span>
          </button>
        )}
      </div>
    </header>
  );
}
