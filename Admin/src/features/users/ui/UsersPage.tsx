import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/shared/format';
import { useCreateUser, useUsersList } from '../queries';

export function UsersPage() {
  const { data, isLoading } = useUsersList();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Cuentas de administrador. Todas tienen los mismos permisos."
        actions={<CreateUserDialog open={open} onOpenChange={setOpen} />}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Cargando usuarios…</p>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Sin usuarios adicionales"
          description="Crea cuentas para el resto del equipo."
        />
      )}

      {(data?.length ?? 0) > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Nombre visible</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.map((u) => (
                <TableRow key={u.id ?? u.username}>
                  <TableCell className="font-mono text-sm">{u.username}</TableCell>
                  <TableCell className="font-medium">{u.displayName}</TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateUser();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ username, displayName, password });
      toast.success('Usuario creado.');
      setUsername('');
      setDisplayName('');
      setPassword('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario admin</DialogTitle>
          <DialogDescription>Se le entregan las credenciales directamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u-username">Usuario</Label>
            <Input
              id="u-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-display">Nombre visible</Label>
            <Input
              id="u-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-password">Contraseña</Label>
            <Input
              id="u-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creando…' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
