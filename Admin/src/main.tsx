import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { buildContainer } from '@/app/container';
import { createAppRouter } from '@/app/router';
import { AppProviders } from '@/app/providers';
import { Toaster } from '@/components/ui/sonner';
import type { AuthService } from '@/features/auth/logic/AuthService';
import '@/styles/globals.css';

// Único punto de arranque (SPA): se construye el contenedor IoC aquí y se
// comparte entre el router (para los guards) y los providers de React.
const container = buildContainer({
  onUnauthorized: () => {
    container.resolve<AuthService>('authService').logout();
    router.invalidate();
  },
});

const router = createAppRouter(container);

// Re-evaluamos los guards de ruta cuando cambia el estado de sesión, para que
// login/logout muevan al usuario sin recargar la página.
container.resolve<AuthService>('authService').subscribe(() => {
  router.invalidate();
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No se encontró #root');

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders container={container}>
      <RouterProvider router={router} />
      <Toaster />
    </AppProviders>
  </StrictMode>,
);
