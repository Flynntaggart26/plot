import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDayKey, weekStartKey, monthStartKey } from '@/lib/date';
import {
  getWeekPlan,
  getMonthPlan,
  upsertDailyPlan,
  scheduleTaskToDay,
  unscheduleTask,
  type WeekView,
  type MonthView,
} from './service';

export const planKeys = {
  all: ['plan'] as const,
  week: (weekStart: string) => ['plan', 'week', weekStart] as const,
  month: (monthStart: string) => ['plan', 'month', monthStart] as const,
};

/** Haftalık plan */
export function useWeekPlan(weekStart: string = weekStartKey()) {
  return useQuery({
    queryKey: planKeys.week(weekStart),
    queryFn: () => getWeekPlan(weekStart),
  });
}

/** Aylık plan */
export function useMonthPlan(monthStart: string = monthStartKey()) {
  return useQuery({
    queryKey: planKeys.month(monthStart),
    queryFn: () => getMonthPlan(monthStart),
  });
}

/** Günlük energy/intention güncelle */
export function useSetDailyPlan(dayKey: string = localDayKey()) {
  const queryClient = useQueryClient();
  const weekKey = weekStartKey(dateFromDayKey(dayKey));
  const monthKey = monthStartKey(dateFromDayKey(dayKey));

  return useMutation({
    mutationFn: (patch: { energy?: number | null; intention?: string | null; capacityMin?: number | null }) =>
      Promise.resolve(upsertDailyPlan(dayKey, patch)),

    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: planKeys.week(weekKey) });
      await queryClient.cancelQueries({ queryKey: planKeys.month(monthKey) });

      const weekSnapshot = queryClient.getQueryData<WeekView>(planKeys.week(weekKey));
      const monthSnapshot = queryClient.getQueryData<MonthView>(planKeys.month(monthKey));

      if (weekSnapshot) {
        queryClient.setQueryData<WeekView>(planKeys.week(weekKey), (old) =>
          old
            ? {
                ...old,
                days: old.days.map((d) =>
                  d.date === dayKey ? { ...d, ...patch } : d
                ),
              }
            : old
        );
      }

      return { weekSnapshot, monthSnapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.weekSnapshot) queryClient.setQueryData(planKeys.week(weekKey), context.weekSnapshot);
      if (context?.monthSnapshot) queryClient.setQueryData(planKeys.month(monthKey), context.monthSnapshot);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.week(weekKey) });
      queryClient.invalidateQueries({ queryKey: planKeys.month(monthKey) });
    },
  });
}

/** Görevi güne sürükle-bırak ile planla */
export function useScheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, dayKey }: { taskId: string; dayKey: string }) =>
      Promise.resolve(scheduleTaskToDay(taskId, dayKey)),

    onSuccess: (_task, { dayKey }) => {
      const weekKey = weekStartKey(dateFromDayKey(dayKey));
      const monthKey = monthStartKey(dateFromDayKey(dayKey));
      queryClient.invalidateQueries({ queryKey: planKeys.week(weekKey) });
      queryClient.invalidateQueries({ queryKey: planKeys.month(monthKey) });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/** Görevin planlamasını kaldır */
export function useUnscheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => Promise.resolve(unscheduleTask(taskId)),

    onSuccess: (_task, taskId) => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/** Yardımcı: dayKey'den Date'e */
function dateFromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}