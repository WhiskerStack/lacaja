import { useQuery } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { SubmissionsService } from './logic/SubmissionsService';

export function useSubmissionsList(search?: string) {
  const service = useService<SubmissionsService>('submissionsService');
  return useQuery({
    queryKey: ['submissions', search ?? ''],
    queryFn: () => service.list(search),
  });
}

export function useSubmission(id: number) {
  const service = useService<SubmissionsService>('submissionsService');
  return useQuery({
    queryKey: ['submissions', 'detail', id],
    queryFn: () => service.getById(id),
    enabled: id > 0,
  });
}
