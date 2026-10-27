import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SubHeader } from '@/ui/components/SubHeader';
import { useTheme } from '@/ui/theme';
import { todayLabel, localDayKey } from '@/lib/date';
import { dismissToRoot } from '@/lib/navigation';
import { toast } from '@/lib/toast';
import { TaskForm, type TaskFormValues } from '@/features/tasks/TaskForm';
import { useCreateTask, useDayTasks } from '@/features/tasks/queries';

/**
 * Yeni görev. Yakalama sheet'inden veya must-do kartındaki +'dan gelir.
 * `mustDo=1` parametresi formun başlangıç seçimini belirler.
 */
export default function NewTaskScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ mustDo?: string }>();
  const dayKey = localDayKey();
  const day = useDayTasks(dayKey);
  const create = useCreateTask();
  const [error, setError] = useState<string | null>(null);

  const submit = (values: TaskFormValues) => {
    setError(null);
    create.mutate(
      {
        title: values.title,
        notes: values.notes,
        estimateMin: values.estimateMin,
        energy: values.energy,
        mustDo: values.mustDo,
      },
      {
        onSuccess: () => {
          toast(values.mustDo ? 'Must-do eklendi' : 'Görev eklendi');
          dismissToRoot();
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Görev kaydedilemedi.');
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Yeni görev" subtitle={todayLabel()} />
      <TaskForm
        defaultMustDo={params.mustDo === '1'}
        openMustDoCount={day.data?.mustDo.length ?? 0}
        submitLabel="Görevi ekle"
        onSubmit={submit}
        busy={create.isPending}
        error={error}
      />
    </View>
  );
}
