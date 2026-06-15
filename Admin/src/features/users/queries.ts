import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { UsersService } from './logic/UsersService';
import type { CreateAdminInput } from './types';

export function useUsersList() {
  const service = useService<UsersService>('usersService');
  return useQuery({ queryKey: ['users'], queryFn: () => service.list() });
}

export function useCreateUser() {
  const service = useService<UsersService>('usersService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminInput) => service.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
