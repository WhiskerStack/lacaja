import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { AdminsService } from './logic/AdminsService';
import type { CreateAdminInput } from './types';

export function useAdminsList() {
  const service = useService<AdminsService>('adminsService');
  return useQuery({ queryKey: ['admins'], queryFn: () => service.list() });
}

export function useCreateAdmin() {
  const service = useService<AdminsService>('adminsService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminInput) => service.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  });
}
