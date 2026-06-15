import { useState } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Clapperboard,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Tags,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { PublishButton } from '@/components/PublishButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { to: '/catalog', label: 'Catálogo', icon: Clapperboard },
  { to: '/submissions', label: 'Envíos', icon: Inbox },
  { to: '/requests', label: 'Solicitudes', icon: ListChecks },
  { to: '/pricing', label: 'Tarifas', icon: Tags },
  { to: '/users', label: 'Usuarios', icon: Users },
] as const;

/** Layout de la zona protegida: barra lateral de navegación + header + outlet. */
export function AppLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  function onLogout() {
    logout();
    navigate({ to: '/login' } as Parameters<typeof navigate>[0]);
  }

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map((item) => {
        const { to, label } = item;
        const Icon = item.icon;
        const exact = 'exact' in item ? item.exact : false;
        const active = exact ? pathname === to : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar fija en escritorio */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Clapperboard className="h-5 w-5 text-primary" />
          <span className="font-semibold">Dahem admin</span>
        </div>
        {sidebar}
      </aside>

      {/* Sidebar móvil (overlay) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-60 flex-col border-r bg-background">
            <div className="flex h-14 items-center gap-2 border-b px-4">
              <Clapperboard className="h-5 w-5 text-primary" />
              <span className="font-semibold">Dahem admin</span>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <PublishButton />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {admin?.displayName ?? 'Cuenta'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{admin?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
