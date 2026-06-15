import { useState } from 'react';
import { Inbox, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCup, formatDate, formatGb } from '@/shared/format';
import { useSubmissionsList } from '../queries';
import type { SubmissionRow } from '../types';
import { SubmissionDetailDialog } from './SubmissionDetailDialog';

export function SubmissionsPage() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const { data, isLoading } = useSubmissionsList(applied);
  const [selected, setSelected] = useState<SubmissionRow | null>(null);

  return (
    <div>
      <PageHeader
        title="Envíos"
        description="Listas recibidas por la web. Localiza por código de envío, nombre o contacto."
      />

      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(search);
        }}
      >
        <Input
          placeholder="Código (E-XXXXX), nombre, correo o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="outline">
          <Search /> Buscar
        </Button>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando envíos…</p>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title="Sin envíos"
          description="Aquí aparecerán las listas enviadas desde la web."
        />
      )}

      {(data?.length ?? 0) > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total GB</TableHead>
                <TableHead className="text-right">Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.map((s) => (
                <TableRow
                  key={s.id ?? s.submissionCode}
                  className="cursor-pointer"
                  onClick={() => setSelected(s)}
                >
                  <TableCell className="font-mono text-xs">{s.submissionCode}</TableCell>
                  <TableCell className="font-medium">{s.userName ?? `#${s.userId}`}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.userPhone ?? s.userEmail ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-right">{formatGb(s.totalGb)}</TableCell>
                  <TableCell className="text-right">{formatCup(s.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SubmissionDetailDialog
        submission={selected}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
