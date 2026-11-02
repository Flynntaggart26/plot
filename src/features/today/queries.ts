import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDayKey } from '@/lib/date';
import { taskKeys } from '@/features/tasks/queries';
import {
  closeDay,
  getDayEnergy,
  getDayPlan,
  setDayEnergy,
  type CloseDayInput,
} from './service';

export const todayKeys = {
  all: ['today'] as const,
  energy: (dayKey: string) => ['today', 'energy', dayKey] as const,
  plan: (dayKey: string) => ['today', 'plan', dayKey] as const,
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

export function useDayPlan(dayKey: string = localDayKey()) {
  return useQuery({
    queryKey: todayKeys.plan(dayKey),
    queryFn: () => getDayPlan(dayKey),
  });
}

export function useCloseDay(dayKey: string = localDayKey()) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CloseDayInput, 'dayKey'>) =>
      Promise.resolve(closeDay({ ...input, dayKey })),

    onSuccess: (plan) => {
      queryClient.setQueryData(todayKeys.plan(dayKey), plan);
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: todayKeys.all });
    },
  });
}
