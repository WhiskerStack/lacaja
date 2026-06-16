import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { UsersService } from './logic/UsersService';
import type { UpdateUserInput } from './types';

export function useUsersList() {
  const service = useService<UsersService>('usersService');
  return useQuery({ queryKey: ['system-users'], queryFn: () => service.list() });
}

export function useUpdateUser() {
  const service = useService<UsersService>('usersService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateUserInput }) => service.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-users'] }),
  });
}

export function useSetUserBanned() {
  const service = useService<UsersService>('usersService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, banned }: { id: number; banned: boolean }) => service.setBanned(id, banned),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-users'] }),
  });
}

export function useDeleteUser() {
  const service = useService<UsersService>('usersService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => service.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-users'] }),
  });
}
