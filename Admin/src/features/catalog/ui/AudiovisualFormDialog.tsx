import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { AudiovisualType } from '@dahem/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { validateAudiovisualInput } from '../domain/validation';
import { useCreateAudiovisual, useUpdateAudiovisual } from '../queries';
import type { AudiovisualInput, AudiovisualRow } from '../types';

const TYPES: { value: AudiovisualType; label: string }[] = [
  { value: 'movie', label: 'Película' },
  { value: 'series', label: 'Serie' },
  { value: 'telenovela', label: 'Telenovela' },
  { value: 'show', label: 'Show' },
  { value: 'anime', label: 'Anime' },
];

const EMPTY: AudiovisualInput = {
  type: 'movie',
  name: '',
  year: new Date().getFullYear(),
  rating: 0,
  sizeGb: 0,
  isPremiere: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene, es edición; si no, creación. */
  editing?: AudiovisualRow | null;
}

export function AudiovisualFormDialog({ open, onOpenChange, editing }: Props) {
  const [form, setForm] = useState<AudiovisualInput>(EMPTY);
  const create = useCreateAudiovisual();
  const update = useUpdateAudiovisual();

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              type: editing.type,
              name: editing.name,
              year: editing.year,
              rating: editing.rating,
              sizeGb: editing.sizeGb,
              isPremiere: editing.isPremiere,
            }
          : EMPTY,
      );
    }
  }, [open, editing]);

  const isEpisodic = form.type !== 'movie';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateAudiovisualInput(form);
    if (errors.length) {
      toast.error(errors.join(' '));
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: form });
        toast.success('Audiovisual actualizado.');
      } else {
        await create.mutateAsync(form);
        toast.success('Audiovisual creado.');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar audiovisual' : 'Nuevo audiovisual'}</DialogTitle>
          <DialogDescription>
            El código ({editing?.code ?? 'se genera'}) se deriva del tipo y el id.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as AudiovisualType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Año</Label>
              <Input
                id="year"
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (0–10)</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sizeGb">Peso (GB)</Label>
              <Input
                id="sizeGb"
                type="number"
                step="0.1"
                min={0}
                value={form.sizeGb}
                disabled={isEpisodic}
                onChange={(e) => setForm((f) => ({ ...f, sizeGb: Number(e.target.value) }))}
              />
              {isEpisodic && (
                <p className="text-xs text-muted-foreground">
                  En episódicos el peso vive en cada temporada/capítulo.
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPremiere}
              onChange={(e) => setForm((f) => ({ ...f, isPremiere: e.target.checked }))}
            />
            Es estreno (afecta el precio)
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
