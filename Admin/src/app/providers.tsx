import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildContainer, type AppContainer } from './container';
import { ThemeProvider } from './theme';
import type { AuthService } from '@/features/auth/logic/AuthService';

// --- Puente contenedor → React ---

const ContainerCtx = createContext<AppContainer | null>(null);

/** Resuelve un servicio del contenedor por su clave registrada. */
export function useService<T>(name: string): T {
  const container = useContext(ContainerCtx);
  if (!container) throw new Error('ContainerProvider ausente');
  return container.resolve<T>(name);
}

/** Hook reactivo al estado de sesión (re-renderiza al login/logout). */
export function useAuth() {
  const auth = useService<AuthService>('authService');
  const isAuthenticated = useSyncExternalStore(
    (cb) => auth.subscribe(cb),
    () => auth.isAuthenticated(),
    () => false,
  );
  return {
    isAuthenticated,
    admin: auth.getAdmin(),
    login: auth.login.bind(auth),
    bootstrap: auth.bootstrap.bind(auth),
    logout: auth.logout.bind(auth),
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
}

interface AppProvidersProps {
  children: ReactNode;
  /** Inyectable en tests para usar un contenedor con fakes. */
  container?: AppContainer;
  queryClient?: QueryClient;
}

export function AppProviders({ children, container, queryClient }: AppProvidersProps) {
  // En 401, limpiamos la sesión; el guard de rutas hará el redirect a /login.
  const [appContainer] = useState<AppContainer>(() => {
    if (container) return container;
    const c = buildContainer({
      onUnauthorized: () => {
        c.resolve<AuthService>('authService').logout();
      },
    });
    return c;
  });

  const [qc] = useState<QueryClient>(() => queryClient ?? createQueryClient());

  // Al perder la sesión, vaciamos la caché de queries para no mostrar datos viejos.
  useEffect(() => {
    const auth = appContainer.resolve<AuthService>('authService');
    return auth.subscribe(() => {
      if (!auth.isAuthenticated()) qc.clear();
    });
  }, [appContainer, qc]);

  const containerValue = useMemo(() => appContainer, [appContainer]);

  return (
    <ContainerCtx.Provider value={containerValue}>
      <QueryClientProvider client={qc}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </ContainerCtx.Provider>
  );
}

export { ContainerCtx };
