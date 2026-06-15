import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCup, formatDate, formatGb } from '@/shared/format';
import type { SubmissionRow } from '../types';

interface Props {
  submission: SubmissionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Detalle de un envío: snapshot de lo pedido (funcional §5.3). */
export function SubmissionDetailDialog({ submission, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envío {submission?.submissionCode}</DialogTitle>
          <DialogDescription>
            {submission?.userName ?? `Usuario #${submission?.userId}`} ·{' '}
            {formatDate(submission?.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {submission && (
          <>
            <div className="text-sm text-muted-foreground">
              Contacto: {submission.userPhone ?? submission.userEmail ?? '—'}
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">GB</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.items.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatGb(item.sizeGb)}</TableCell>
                      <TableCell className="text-right">{formatCup(item.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-6 text-sm font-medium">
              <span>Total: {formatGb(submission.totalGb)}</span>
              <span>{formatCup(submission.totalPrice)}</span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
