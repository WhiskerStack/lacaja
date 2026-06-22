import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  HardDrive,
  RefreshCw,
  RotateCw,
  ScanLine,
  ServerCog,
} from 'lucide-react';
import type { AudiovisualType } from '@dahem/domain';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SEARCH_ENGINE_URL } from '../api/SearchEngineApi';
import { useImportCatalog, useRescanInventory, useScanInventory, useSearchEngineHealth } from '../queries';
import type { ImportResult, ScanResult } from '../types';

const TYPE_LABEL: Record<AudiovisualType, string> = {
  movie: 'Película',
  series: 'Serie',
  anime: 'Anime',
  telenovela: 'Novela',
  show: 'Show',
};

export function InventoryPage() {
  const health = useSearchEngineHealth();
  const scan = useScanInventory();
  const rescan = useRescanInventory();
  const importCatalog = useImportCatalog();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);

  async function loadScan(fresh: boolean) {
    setImported(null);
    try {
      const res = await (fresh ? rescan : scan).mutateAsync();
      setResult(res);
      const enrichNote = res.enriched ? '' : ' (sin enriquecer: configura TMDB_API_KEY)';
      const source = fresh ? 'Re-escaneo del disco' : 'Escaneo';
      toast.success(`${source} completado: ${res.stats.total} títulos${enrichNote}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo escanear.');
    }
  }

  async function onImport() {
    if (!result?.items.length) return;
    try {
      const res = await importCatalog.mutateAsync(result.items);
      setImported(res);
      toast.success(`Importación: ${res.created} nuevos, ${res.skipped} ya existían.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo importar.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventario físico"
        description="Detecta el SearchEngine local, escanea las películas/series del disco y cárgalas a la base de datos."
        actions={
          health.data ? (
            <Button variant="outline" size="sm" onClick={() => health.refetch()}>
              <RefreshCw className="h-4 w-4" /> Recomprobar
            </Button>
          ) : undefined
        }
      />

      {health.isLoading && (
        <p className="text-sm text-muted-foreground">Detectando SearchEngine local…</p>
      )}

      {!health.isLoading && !health.data && (
        <EmptyState
          icon={<ServerCog className="h-8 w-8" />}
          title="SearchEngine local no detectado"
          description={`No respondió en ${SEARCH_ENGINE_URL}. Inicia el ejecutable en la carpeta de las películas y vuelve a comprobar.`}
          action={
            <Button onClick={() => health.refetch()}>
              <RefreshCw className="h-4 w-4" /> Reintentar
            </Button>
          }
        />
      )}

      {health.data && (
        <div className="space-y-6">
          <HealthCard root={health.data.root} enrichEnabled={health.data.enrichEnabled} version={health.data.version} />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => loadScan(false)} disabled={scan.isPending || rescan.isPending}>
              <ScanLine className="h-4 w-4" />
              {scan.isPending ? 'Escaneando…' : 'Escanear inventario'}
            </Button>
            <Button variant="outline" onClick={() => loadScan(true)} disabled={scan.isPending || rescan.isPending}>
              <RotateCw className="h-4 w-4" />
              {rescan.isPending ? 'Re-escaneando…' : 'Re-escanear disco'}
            </Button>
            {result && (
              <Button variant="default" onClick={onImport} disabled={importCatalog.isPending || result.items.length === 0}>
                <DatabaseZap className="h-4 w-4" />
                {importCatalog.isPending ? 'Cargando…' : `Cargar ${result.items.length} a BD`}
              </Button>
            )}
          </div>

          {imported && <ImportSummary result={imported} />}

          {result && <ScanTable result={result} />}
        </div>
      )}
    </div>
  );
}

function HealthCard({ root, enrichEnabled, version }: { root: string; enrichEnabled: boolean; version: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <HardDrive className="h-4 w-4 text-primary" /> SearchEngine v{version} activo
      </div>
      <dl className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="truncate">
          <span className="font-medium text-foreground">Carpeta: </span>
          <span className="font-mono">{root}</span>
        </div>
        <div>
          <span className="font-medium text-foreground">Enriquecimiento TMDb: </span>
          {enrichEnabled ? (
            <Badge variant="success">activo</Badge>
          ) : (
            <Badge variant="warning">sin API key</Badge>
          )}
        </div>
      </dl>
    </div>
  );
}

function ImportSummary({ result }: { result: ImportResult }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-green-600/30 bg-green-600/10 p-4 text-sm">
      <span className="flex items-center gap-2 font-medium">
        <CheckCircle2 className="h-4 w-4 text-green-600" /> Importación completada
      </span>
      <span>
        <strong>{result.created}</strong> creados
      </span>
      <span className="text-muted-foreground">
        <strong>{result.skipped}</strong> ya existían (omitidos)
      </span>
    </div>
  );
}

function ScanTable({ result }: { result: ScanResult }) {
  const { stats, items, warnings } = result;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{stats.total} títulos</Badge>
        <Badge variant="outline">{stats.movies} películas</Badge>
        <Badge variant="outline">{stats.series} series</Badge>
        <Badge variant="outline">{stats.episodes} capítulos</Badge>
        <Badge variant="outline">{stats.totalSizeGb.toFixed(2)} GB</Badge>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> {warnings.length} archivos no reconocidos
          </div>
          <ul className="mt-1 max-h-32 overflow-y-auto pl-6 text-xs text-muted-foreground">
            {warnings.map((w) => (
              <li key={w} className="list-disc">{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Año</TableHead>
              <TableHead className="text-right">Peso</TableHead>
              <TableHead className="text-right">Nota</TableHead>
              <TableHead>Género</TableHead>
              <TableHead>TMDb</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.code}>
                <TableCell className="font-mono text-sm">{it.code}</TableCell>
                <TableCell>{TYPE_LABEL[it.type] ?? it.type}</TableCell>
                <TableCell className="font-medium">
                  {it.title}
                  {it.titleEn && it.titleEn !== it.title && (
                    <span className="block text-xs text-muted-foreground">{it.titleEn}</span>
                  )}
                  {it.seasons && it.seasons.length > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {it.seasons.length} temp. · {it.seasons.reduce((n, s) => n + s.episodes.length, 0)} cap.
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {it.year}
                  {it.isPremiere && <Badge variant="secondary" className="ml-1">estreno</Badge>}
                </TableCell>
                <TableCell className="text-right text-sm">{it.sizeGb.toFixed(2)} GB</TableCell>
                <TableCell className="text-right text-sm">{it.rating ? it.rating.toFixed(1) : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{it.genre || '—'}</TableCell>
                <TableCell>
                  {it.enriched ? (
                    <Badge variant="success">sí</Badge>
                  ) : (
                    <Badge variant="outline">no</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
