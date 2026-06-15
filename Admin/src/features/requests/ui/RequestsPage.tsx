import { useState } from 'react';
import { toast } from 'sonner';
import { ListChecks, MessageCircle } from 'lucide-react';
import type { RequestStatus } from '@dahem/domain';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, requestStatusLabel } from '@/shared/format';
import { availableMessage, whatsappLink } from '@/shared/whatsapp';
import { useRequestsList, useUpdateRequestStatus } from '../queries';
import type { RequestRow } from '../types';

const STATUSES: RequestStatus[] = ['pending', 'available', 'notified'];

export function RequestsPage() {
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');
  const { data, isLoading } = useRequestsList(filter === 'all' ? undefined : filter);
  const updateStatus = useUpdateRequestStatus();

  async function changeStatus(row: RequestRow, status: RequestStatus) {
    try {
      await updateStatus.mutateAsync({ row, status });
      toast.success(`Marcada como ${requestStatusLabel(status).toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  }

  function notify(row: RequestRow) {
    const link = whatsappLink(row.userPhone, availableMessage(row.userName ?? '', row.searchText));
    if (!link) {
      toast.error('El solicitante no tiene teléfono para WhatsApp.');
      return;
    }
    window.open(link, '_blank', 'noopener');
    // Tras abrir el aviso, marcamos como avisado (funcional §6.2).
    void changeStatus(row, 'notified');
  }

  return (
    <div>
      <PageHeader
        title="Solicitudes"
        description="Pedidos de contenido no disponible y su seguimiento."
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as RequestStatus | 'all')} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {requestStatusLabel(s)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando solicitudes…</p>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="Sin solicitudes"
          description="No hay solicitudes para este filtro."
        />
      )}

      {(data?.length ?? 0) > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buscó</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.searchText}</TableCell>
                  <TableCell>{r.userName ?? `#${r.userId}`}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.userPhone ?? r.userEmail ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(r.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => notify(r)}
                        title="Avisar por WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" /> Avisar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Estado
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              disabled={r.status === s}
                              onClick={() => changeStatus(r, s)}
                            >
                              {requestStatusLabel(s)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  if (status === 'pending') return <Badge variant="warning">Pendiente</Badge>;
  if (status === 'available') return <Badge variant="success">Disponible</Badge>;
  return <Badge variant="secondary">Avisado</Badge>;
}
