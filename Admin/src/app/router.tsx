import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import type { AppContainer } from './container';
import { requireAuth, loginGuard, bootstrapGuard, type RouterContext } from '@/features/auth/logic/guard';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/features/auth/ui/LoginPage';
import { BootstrapPage } from '@/features/auth/ui/BootstrapPage';
import { DashboardPage } from '@/features/dashboard/ui/DashboardPage';
import { CatalogListPage } from '@/features/catalog/ui/CatalogListPage';
import { SubmissionsPage } from '@/features/submissions/ui/SubmissionsPage';
import { RequestsPage } from '@/features/requests/ui/RequestsPage';
import { PricingPage } from '@/features/pricing/ui/PricingPage';
import { UsersPage } from '@/features/users/ui/UsersPage';

// Raíz con contexto tipado: el contenedor IoC viaja por aquí a los guards.
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

// --- Rutas públicas ---
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: loginGuard,
  // Tipado laxo para la búsqueda ?redirect=...
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
});

const bootstrapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bootstrap',
  beforeLoad: bootstrapGuard,
  component: BootstrapPage,
});

// --- Layout protegido ---
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: requireAuth,
  component: AppLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: DashboardPage,
});

const catalogRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/catalog',
  component: CatalogListPage,
});

const submissionsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/submissions',
  component: SubmissionsPage,
});

const requestsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/requests',
  component: RequestsPage,
});

const pricingRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/pricing',
  component: PricingPage,
});

const usersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/users',
  component: UsersPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  bootstrapRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    catalogRoute,
    submissionsRoute,
    requestsRoute,
    pricingRoute,
    usersRoute,
  ]),
]);

export function createAppRouter(container: AppContainer) {
  return createRouter({
    routeTree,
    context: { container },
    defaultPreload: 'intent',
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

// Registro de tipos para el tipado fuerte de TanStack Router.
declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
