import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatGb } from '@/shared/format';
import {
  useCreateEpisode,
  useCreateSeason,
  useDeleteSeason,
  useSeasons,
} from '../queries';
import type { AudiovisualRow, SeasonRow } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audiovisual: AudiovisualRow | null;
}

/** Editor de temporadas y capítulos de un audiovisual episódico (funcional §4.3). */
export function EpisodicEditorDialog({ open, onOpenChange, audiovisual }: Props) {
  const id = audiovisual?.id ?? 0;
  const seasons = useSeasons(id);
  const createSeason = useCreateSeason(id);
  const deleteSeason = useDeleteSeason(id);
  const [seasonNumber, setSeasonNumber] = useState('');
  const [seasonSize, setSeasonSize] = useState('');
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  async function addSeason() {
    try {
      await createSeason.mutateAsync({
        number: Number(seasonNumber),
        sizeGb: Number(seasonSize) || 0,
      });
      setSeasonNumber('');
      setSeasonSize('');
      toast.success('Temporada agregada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar.');
    }
  }

  async function removeSeason(seasonId: number) {
    try {
      await deleteSeason.mutateAsync(seasonId);
      toast.success('Temporada eliminada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Temporadas y capítulos · {audiovisual?.name} ({audiovisual?.code})
          </DialogTitle>
          <DialogDescription>
            El código de cada nivel se deriva solo: {audiovisual?.code}-1, {audiovisual?.code}-1-10.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="snum">N.º temporada</Label>
            <Input
              id="snum"
              type="number"
              min={1}
              className="w-28"
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ssize">Peso GB (si no hay capítulos)</Label>
            <Input
              id="ssize"
              type="number"
              min={0}
              step="0.1"
              className="w-40"
              value={seasonSize}
              onChange={(e) => setSeasonSize(e.target.value)}
            />
          </div>
          <Button onClick={addSeason} disabled={!seasonNumber || createSeason.isPending}>
            <Plus /> Agregar
          </Button>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {seasons.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {seasons.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay temporadas.</p>
          )}
          {seasons.data?.map((s) => (
            <div key={s.id} className="rounded-md border">
              <div className="flex items-center justify-between p-3">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium"
                  onClick={() => setOpenSeason((cur) => (cur === s.id ? null : s.id))}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${openSeason === s.id ? 'rotate-90' : ''}`}
                  />
                  Temporada {s.number}
                  <span className="text-muted-foreground">· {formatGb(s.sizeGb)}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSeason(s.id)}
                  aria-label="Eliminar temporada"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {openSeason === s.id && <EpisodesPanel audiovisualId={id} season={s} />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EpisodesPanel({
  audiovisualId,
  season,
}: {
  audiovisualId: number;
  season: SeasonRow;
}) {
  const createEpisode = useCreateEpisode(audiovisualId, season.id);
  const [num, setNum] = useState('');
  const [size, setSize] = useState('');
  const [duration, setDuration] = useState('');

  async function add() {
    try {
      await createEpisode.mutateAsync({
        number: Number(num),
        sizeGb: Number(size) || 0,
        durationMin: duration ? Number(duration) : undefined,
      });
      setNum('');
      setSize('');
      setDuration('');
      toast.success(`Capítulo ${num} agregado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar el capítulo.');
    }
  }

  return (
    <div className="border-t bg-muted/30 p-3">
      <div className="mb-2 flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">N.º</Label>
          <Input
            type="number"
            min={1}
            className="h-8 w-20"
            value={num}
            onChange={(e) => setNum(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GB</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            className="h-8 w-24"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            min={0}
            className="h-8 w-24"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={add} disabled={!num || createEpisode.isPending}>
          <Plus /> Capítulo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        El peso de la temporada ({formatGb(season.sizeGb)}) se actualiza con sus capítulos. El
        backend no devuelve el listado de capítulos, así que aquí solo se agregan.
      </p>
    </div>
  );
}
