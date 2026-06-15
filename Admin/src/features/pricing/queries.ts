import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useService } from '@/app/providers';
import type { PricingService } from './logic/PricingService';
import type { PricingInput } from './types';

export function usePricing() {
  const service = useService<PricingService>('pricingService');
  return useQuery({ queryKey: ['pricing'], queryFn: () => service.getRate() });
}

export function useUpdatePricing() {
  const service = useService<PricingService>('pricingService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PricingInput) => service.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing'] }),
  });
}
