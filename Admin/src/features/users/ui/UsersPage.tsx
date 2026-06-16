import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Ban, MoreHorizontal, Pencil, ShieldCheck, Trash2, Users } from 'lucide-react';
import type { User } from '@dahem/domain';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeleteUser, useSetUserBanned, useUpdateUser, useUsersList } from '../queries';

export function UsersPage() {
  const { data, isLoading } = useUsersList();
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const setBanned = useSetUserBanned();

  async function onToggleBan(user: User) {
    try {
      await setBanned.mutateAsync({ id: user.id!, banned: !user.banned });
      toast.success(user.banned ? 'Cliente reactivado.' : 'Cliente baneado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Clientes del sistema. Puedes editarlos, banearlos o borrarlos."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Cargando usuarios…</p>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Sin usuarios"
          description="Aún no hay clientes registrados en el sistema."
        />
      )}

      {(data?.length ?? 0) > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.map((u) => (
                <TableRow key={u.id ?? u.code}>
                  <TableCell className="font-mono text-sm">{u.code || '—'}</TableCell>
                  <TableCell className="font-medium">{u.fullName()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[u.email, u.phone].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive">Baneado</Badge>
                    ) : (
                      <Badge variant="success">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(u)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleBan(u)}>
                          {u.banned ? (
                            <>
                              <ShieldCheck className="h-4 w-4" /> Reactivar
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4" /> Banear
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleting(u)}
                        >
                          <Trash2 className="h-4 w-4" /> Borrar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
      <DeleteUserDialog user={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function EditUserDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const update = useUpdateUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Sincroniza el formulario cada vez que se abre con un cliente distinto.
  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (user && user.id !== syncedId) {
    setSyncedId(user.id ?? null);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email ?? '');
    setPhone(user.phone ?? '');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      await update.mutateAsync({
        id: user.id!,
        input: {
          firstName,
          lastName,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      });
      toast.success('Usuario actualizado.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  }

  return (
    <Dialog open={user !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario {user?.code}</DialogTitle>
          <DialogDescription>El código es fijo y no se puede cambiar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-first">Nombre</Label>
            <Input id="e-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-last">Apellidos</Label>
            <Input id="e-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-email">Correo</Label>
            <Input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-phone">Teléfono</Label>
            <Input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="text-xs text-muted-foreground">Se requiere al menos un correo o un teléfono.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const del = useDeleteUser();

  async function onConfirm() {
    if (!user) return;
    try {
      await del.mutateAsync(user.id!);
      toast.success('Usuario borrado.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo borrar.');
    }
  }

  return (
    <Dialog open={user !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar usuario {user?.code}</DialogTitle>
          <DialogDescription>
            Se eliminará a {user?.fullName()} de forma permanente. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={del.isPending}>
            {del.isPending ? 'Borrando…' : 'Borrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
