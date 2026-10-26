import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDayKey } from '@/lib/date';
import type { Task } from '@/db/schema';
import {
  completeTask,
  createTask,
  deleteTask,
  getTask,
  listDayTasks,
  reopenTask,
  updateTask,
  type CreateTaskInput,
  type DayTasks,
  type UpdateTaskInput,
} from './service';

/**
 * Görev sorguları ve mutasyonları.
 *
 * Tamamla/geri aç anında iyimser güncellenir: dokunuş ile kartın yer
 * değiştirmesi arasında 300 ms boşluk "bozuk" hissettirir. Hata olursa
 * önceki anlık görüntü geri yüklenir, ardından sunucu (SQLite) gerçeği
 * yeniden okunur.
 */

export const taskKeys = {
  all: ['tasks'] as const,
  dayRoot: ['tasks', 'day'] as const,
  day: (dayKey: string) => ['tasks', 'day', dayKey] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};

export function useDayTasks(dayKey: string = localDayKey()) {
  return useQuery({
    queryKey: taskKeys.day(dayKey),
    queryFn: () => listDayTasks(dayKey),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ''),
    queryFn: () => (id ? getTask(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => Promise.resolve(createTask(input)),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateTaskInput) => Promise.resolve(updateTask(id, patch)),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(id), task);
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      deleteTask(id);
      return Promise.resolve(id);
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

function withStatus(data: DayTasks, id: string, done: boolean): DayTasks {
  const task = [...data.mustDo, ...data.open, ...data.done].find((item) => item.id === id);
  if (!task) return data;

  const next: Task = {
    ...task,
    status: done ? 'done' : 'open',
    completedAt: done ? (task.completedAt ?? new Date().toISOString()) : null,
  };

  const mustDo = data.mustDo.filter((item) => item.id !== id);
  const open = data.open.filter((item) => item.id !== id);
  const doneList = data.done.filter((item) => item.id !== id);

  if (done) {
    doneList.unshift(next);
  } else if (next.priority === 1) {
    mustDo.push(next);
  } else {
    open.push(next);
  }

  return { mustDo, open, done: doneList };
}

export function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      Promise.resolve(done ? completeTask(id) : reopenTask(id)),

    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.dayRoot });
      const snapshots = queryClient.getQueriesData<DayTasks>({ queryKey: taskKeys.dayRoot });

      queryClient.setQueriesData<DayTasks>({ queryKey: taskKeys.dayRoot }, (data) =>
        data ? withStatus(data, id, done) : data,
      );

      return { snapshots };
    },

    onError: (_error, _vars, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: (task) => {
      if (task) {
        queryClient.setQueryData(taskKeys.detail(task.id), task);
      }
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
