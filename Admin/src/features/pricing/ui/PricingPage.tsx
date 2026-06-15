import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCup } from '@/shared/format';
import { usePricing, useUpdatePricing } from '../queries';

export function PricingPage() {
  const { data, isLoading } = usePricing();
  const update = useUpdatePricing();
  const [normal, setNormal] = useState('');
  const [premiere, setPremiere] = useState('');

  useEffect(() => {
    if (data) {
      setNormal(String(data.normal));
      setPremiere(String(data.premiere));
    }
  }, [data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ normal: Number(normal), premiere: Number(premiere) });
      toast.success('Tarifas actualizadas. Publica para reflejarlas en la web.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Tarifas"
        description="Precios configurables en CUP. Se aplican por unidad agregada a la lista."
      />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Precios por unidad</CardTitle>
          <CardDescription>
            Valores de referencia: normal $10, estreno $20.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando tarifas…</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="normal">Audiovisual normal (CUP)</Label>
                <Input
                  id="normal"
                  type="number"
                  min={0}
                  value={normal}
                  onChange={(e) => setNormal(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Actual: {data ? formatCup(data.normal) : '—'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="premiere">Estreno (CUP)</Label>
                <Input
                  id="premiere"
                  type="number"
                  min={0}
                  value={premiere}
                  onChange={(e) => setPremiere(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Actual: {data ? formatCup(data.premiere) : '—'}
                </p>
              </div>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Guardando…' : 'Guardar tarifas'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
