import { Rocket, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePublishStatus, useTriggerPublish } from '@/features/publish/queries';

/** Botón de publicar del header: dispara el build del landing y muestra estado. */
export function PublishButton() {
  const { data: status } = usePublishStatus();
  const trigger = useTriggerPublish();
  const running = status?.state === 'running' || trigger.isPending;

  async function onClick() {
    try {
      await trigger.mutateAsync();
      toast.success('Publicación iniciada. La web se regenerará en unos momentos.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar.');
    }
  }

  return (
    <Button onClick={onClick} disabled={running} size="sm" variant="default">
      {running ? <Loader2 className="animate-spin" /> : <Rocket />}
      {running ? 'Publicando…' : 'Publicar'}
    </Button>
  );
}
