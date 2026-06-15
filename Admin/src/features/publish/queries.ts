import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { PublishService } from './logic/PublishService';

export function usePublishStatus() {
  const service = useService<PublishService>('publishService');
  return useQuery({
    queryKey: ['publish', 'status'],
    queryFn: () => service.status(),
    // Sondea mientras el build pueda estar en curso.
    refetchInterval: (query) =>
      query.state.data?.state === 'running' ? 3000 : false,
  });
}

export function useTriggerPublish() {
  const service = useService<PublishService>('publishService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => service.trigger(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publish', 'status'] }),
  });
}
