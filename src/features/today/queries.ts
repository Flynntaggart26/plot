import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDayKey } from '@/lib/date';
import { getDayEnergy, setDayEnergy } from './service';

export const todayKeys = {
  all: ['today'] as const,
  energy: (dayKey: string) => ['today', 'energy', dayKey] as const,
};

export function useDayEnergy(dayKey: string = localDayKey()) {
  return useQuery({
    queryKey: todayKeys.energy(dayKey),
    queryFn: () => getDayEnergy(dayKey),
  });
}

export function useSetDayEnergy(dayKey: string = localDayKey()) {
  const queryClient = useQueryClient();
  const key = todayKeys.energy(dayKey);

  return useMutation({
    mutationFn: (energy: number) => {
      setDayEnergy(energy, dayKey);
      return Promise.resolve(energy);
    },

    onMutate: async (energy) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<number | null>(key);
      queryClient.setQueryData(key, energy);
      return { previous };
    },

    onError: (_error, _energy, context) => {
      queryClient.setQueryData(key, context?.previous ?? null);
    },

    onSuccess: (energy) => {
      queryClient.setQueryData(key, energy);
    },
  });
}
