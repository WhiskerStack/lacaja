import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuxList, useCreateAux, useDeleteAux } from '../queries';
import type { AuxKind } from '../types';

const TABS: { kind: AuxKind; label: string }[] = [
  { kind: 'genres', label: 'Géneros' },
  { kind: 'regions', label: 'Regiones' },
  { kind: 'languages', label: 'Idiomas' },
  { kind: 'cast', label: 'Reparto' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Gestión de catálogos auxiliares: géneros, regiones, idiomas, reparto (§4.4–4.5). */
export function AuxCatalogsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Catálogos auxiliares</DialogTitle>
          <DialogDescription>
            Mantén consistentes los filtros de la biblioteca pública.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="genres">
          <TabsList className="w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t.kind} value={t.kind} className="flex-1">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.kind} value={t.kind}>
              <AuxManager kind={t.kind} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AuxManager({ kind }: { kind: AuxKind }) {
  const list = useAuxList(kind);
  const create = useCreateAux(kind);
  const remove = useDeleteAux(kind);
  const [name, setName] = useState('');

  async function add() {
    try {
      await create.mutateAsync(name);
      setName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar.');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()}
        />
        <Button onClick={add} disabled={!name.trim() || create.isPending}>
          <Plus /> Agregar
        </Button>
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {list.isLoading && <li className="text-sm text-muted-foreground">Cargando…</li>}
        {list.data?.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin elementos.</li>
        )}
        {list.data?.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded border px-3 py-1.5 text-sm"
          >
            {item.name}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => remove.mutate(item.id)}
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
