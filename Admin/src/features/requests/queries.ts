import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RequestStatus } from '@dahem/domain';
import { useService } from '@/app/providers';
import type { RequestsService } from './logic/RequestsService';
import type { RequestRow } from './types';

export function useRequestsList(status?: RequestStatus) {
  const service = useService<RequestsService>('requestsService');
  return useQuery({
    queryKey: ['requests', status ?? 'all'],
    queryFn: () => service.list(status),
  });
}

export function useUpdateRequestStatus() {
  const service = useService<RequestsService>('requestsService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ row, status }: { row: RequestRow; status: RequestStatus }) =>
      service.updateStatus(row, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}
