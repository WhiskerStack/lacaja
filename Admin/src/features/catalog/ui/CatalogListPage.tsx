import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Clapperboard, Layers, ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { audiovisualTypeLabel } from '@/shared/format';
import { useCatalogList, useDeleteAudiovisual } from '../queries';
import type { AudiovisualRow } from '../types';
import { AudiovisualFormDialog } from './AudiovisualFormDialog';
import { EpisodicEditorDialog } from './EpisodicEditorDialog';
import { AuxCatalogsDialog } from './AuxCatalogsDialog';

export function CatalogListPage() {
  const { data, isLoading, isError, error } = useCatalogList();
  const del = useDeleteAudiovisual();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AudiovisualRow | null>(null);
  const [episodic, setEpisodic] = useState<AudiovisualRow | null>(null);
  const [auxOpen, setAuxOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        audiovisualTypeLabel(a.type).toLowerCase().includes(q),
    );
  }, [data, query]);

  async function onDelete(row: AudiovisualRow) {
    if (!confirm(`¿Eliminar "${row.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await del.mutateAsync(row.id);
      toast.success('Audiovisual eliminado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Catálogo"
        description="Audiovisuales que alimentan la web pública."
        actions={
          <>
            <Button variant="outline" onClick={() => setAuxOpen(true)}>
              <ListTree /> Catálogos aux.
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Nuevo
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre, código o tipo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando catálogo…</p>}
      {isError && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Error al cargar.'}
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={<Clapperboard className="h-8 w-8" />}
          title="Sin audiovisuales"
          description="Crea el primero para empezar a poblar el catálogo."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus /> Nuevo audiovisual
            </Button>
          }
        />
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Estreno</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{audiovisualTypeLabel(a.type)}</TableCell>
                  <TableCell>{a.year}</TableCell>
                  <TableCell>
                    {a.isPremiere ? <Badge variant="warning">Estreno</Badge> : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {a.isEpisodic && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEpisodic(a)}
                          aria-label="Temporadas y capítulos"
                          title="Temporadas y capítulos"
                        >
                          <Layers className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(a);
                          setFormOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(a)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AudiovisualFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <EpisodicEditorDialog
        open={episodic !== null}
        onOpenChange={(o) => !o && setEpisodic(null)}
        audiovisual={episodic}
      />
      <AuxCatalogsDialog open={auxOpen} onOpenChange={setAuxOpen} />
    </div>
  );
}
