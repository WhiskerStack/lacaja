import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/app/theme';

/** Toaster de sonner enlazado al tema activo del panel. */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      richColors
      closeButton
    />
  );
}
