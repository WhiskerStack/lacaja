import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/theme';

/** Conmutador claro/oscuro. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
