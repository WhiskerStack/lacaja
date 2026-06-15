import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ShieldPlus } from 'lucide-react';
import { useAuth } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Primer arranque (funcional admin §2.1): crea la cuenta inicial cuando no
 * existe ningún administrador. Aparece una sola vez.
 */
export function BootstrapPage() {
  const { bootstrap } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await bootstrap({ username, displayName, password });
      toast.success('Cuenta inicial creada.');
      navigate({ to: '/' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldPlus className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Primer arranque</CardTitle>
          <CardDescription>
            No hay ningún administrador todavía. Crea la cuenta inicial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre visible</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando…' : 'Crear cuenta inicial'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
