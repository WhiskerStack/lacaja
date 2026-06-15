import { Link } from '@tanstack/react-router';
import { Clapperboard, Inbox, ListChecks, Tags } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/app/providers';
import { useCatalogList } from '@/features/catalog/queries';
import { useSubmissionsList } from '@/features/submissions/queries';
import { useRequestsList } from '@/features/requests/queries';
import { usePublishStatus } from '@/features/publish/queries';
import { formatDate } from '@/shared/format';

export function DashboardPage() {
  const { admin } = useAuth();
  const catalog = useCatalogList();
  const submissions = useSubmissionsList();
  const pendingRequests = useRequestsList('pending');
  const publish = usePublishStatus();

  const cards = [
    {
      to: '/catalog',
      label: 'Audiovisuales',
      icon: Clapperboard,
      value: catalog.data?.length ?? '—',
    },
    {
      to: '/submissions',
      label: 'Envíos recibidos',
      icon: Inbox,
      value: submissions.data?.length ?? '—',
    },
    {
      to: '/requests',
      label: 'Solicitudes pendientes',
      icon: ListChecks,
      value: pendingRequests.data?.length ?? '—',
    },
    {
      to: '/pricing',
      label: 'Tarifas',
      icon: Tags,
      value: 'Ver',
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title={`Hola, ${admin?.displayName ?? 'admin'}`}
        description="Resumen del panel de Daher."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ to, label, icon: Icon, value }) => (
          <Link key={to} to={to}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Estado de publicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Estado:</span>
            <PublishStateBadge state={publish.data?.state} />
          </div>
          {publish.data?.finishedAt && (
            <p className="text-muted-foreground">
              Última publicación: {formatDate(publish.data.finishedAt)}
            </p>
          )}
          {publish.data?.hasPendingChanges && (
            <p className="text-amber-600">Hay cambios sin publicar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PublishStateBadge({ state }: { state?: string }) {
  if (state === 'running') return <Badge variant="warning">En curso</Badge>;
  if (state === 'error') return <Badge variant="destructive">Error</Badge>;
  if (state === 'success') return <Badge variant="success">Publicado</Badge>;
  return <Badge variant="secondary">Sin actividad</Badge>;
}
