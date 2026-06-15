import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Clapperboard, LogIn } from 'lucide-react';
import { useAuth } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
      toast.success('Sesión iniciada.');
      navigate({ to: search.redirect ?? '/' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Daher · Panel admin</CardTitle>
          <CardDescription>Inicia sesión para gestionar el catálogo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn />
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            ¿Primer arranque?{' '}
            <Link to="/bootstrap" className="font-medium text-primary hover:underline">
              Crear cuenta inicial
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
