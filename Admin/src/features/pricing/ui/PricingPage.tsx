import { AUDIOVISUAL_TYPES, type AudiovisualType, type Rate } from '@dahem/domain';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { audiovisualTypeLabel, formatCup } from '@/shared/format';
import { usePricing, useUpdatePricing } from '../queries';

/** Tarifas en edición como strings (evita NaN mientras se escribe). */
type Draft = Record<AudiovisualType, { normal: string; premiere: string }>;

const EMPTY_DRAFT: Draft = AUDIOVISUAL_TYPES.reduce((acc, type) => {
  acc[type] = { normal: '', premiere: '' };
  return acc;
}, {} as Draft);

function draftFromRate(rate: Rate): Draft {
  return AUDIOVISUAL_TYPES.reduce((acc, type) => {
    acc[type] = { normal: String(rate[type].normal), premiere: String(rate[type].premiere) };
    return acc;
  }, {} as Draft);
}

export function PricingPage() {
  const { data, isLoading } = usePricing();
  const update = useUpdatePricing();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  useEffect(() => {
    if (data) setDraft(draftFromRate(data));
  }, [data]);

  function setField(type: AudiovisualType, key: 'normal' | 'premiere', value: string) {
    setDraft((d) => ({ ...d, [type]: { ...d[type], [key]: value } }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const rate = AUDIOVISUAL_TYPES.reduce((acc, type) => {
        acc[type] = { normal: Number(draft[type].normal), premiere: Number(draft[type].premiere) };
        return acc;
      }, {} as Rate);
      await update.mutateAsync(rate);
      toast.success('Tarifas actualizadas. Publica para reflejarlas en la web.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Tarifas"
        description="Precios configurables en CUP por tipo de audiovisual. En episódicos el precio es por capítulo."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tarifas…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {AUDIOVISUAL_TYPES.map((type) => {
              const isEpisodic = type !== 'movie';
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="text-base">{audiovisualTypeLabel(type)}</CardTitle>
                    <CardDescription>
                      {isEpisodic ? 'Precio por capítulo (CUP)' : 'Precio por película (CUP)'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${type}-normal`}>Normal (CUP)</Label>
                      <Input
                        id={`${type}-normal`}
                        type="number"
                        min={0}
                        value={draft[type].normal}
                        onChange={(e) => setField(type, 'normal', e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Actual: {data ? formatCup(data[type].normal) : '—'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${type}-premiere`}>Estreno (CUP)</Label>
                      <Input
                        id={`${type}-premiere`}
                        type="number"
                        min={0}
                        value={draft[type].premiere}
                        onChange={(e) => setField(type, 'premiere', e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Actual: {data ? formatCup(data[type].premiere) : '—'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar tarifas'}
          </Button>
        </form>
      )}
    </div>
  );
}
