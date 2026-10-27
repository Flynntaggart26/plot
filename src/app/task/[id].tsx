import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { localDayKey } from '@/lib/date';
import { dismissToRoot } from '@/lib/navigation';
import { toast } from '@/lib/toast';
import { TaskForm, type TaskFormValues } from '@/features/tasks/TaskForm';
import {
  useDayTasks,
  useDeleteTask,
  useTask,
  useToggleTask,
  useUpdateTask,
} from '@/features/tasks/queries';

/**
 * Görev detayı ve düzenleme. Silme iki adımlı: önce satır içi onay paneli,
 * sonra gerçek silme. Sistem diyaloğu yerine satır içi çünkü web'de de aynı
 * davranışı gösterir ve bağlamı kaybettirmez.
 */
export default function TaskDetailScreen() {
  const { c, space, radius } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const taskQuery = useTask(id);
  const day = useDayTasks(localDayKey());
  const update = useUpdateTask(id ?? '');
  const toggle = useToggleTask();
  const remove = useDeleteTask();

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const task = taskQuery.data ?? null;
  const done = task?.status === 'done' || task?.status === 'dropped';

  const submit = (values: TaskFormValues) => {
    if (!id) return;
    setError(null);
    update.mutate(
      {
        title: values.title,
        notes: values.notes,
        estimateMin: values.estimateMin,
        energy: values.energy,
        mustDo: values.mustDo,
      },
      {
        onSuccess: () => {
          toast('Görev güncellendi');
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Görev kaydedilemedi.');
        },
      },
    );
  };

  if (taskQuery.isPending) {
    return (
      <Shell>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </Shell>
    );
  }

  if (!task) {
    return (
      <Shell title="Görev">
        <View style={{ padding: space.lg, gap: space.xs }}>
          <AppText variant="section">Görev bulunamadı</AppText>
          <AppText variant="body" muted>
            Silinmiş ya da hiç var olmamış olabilir.
          </AppText>
        </View>
      </Shell>
    );
  }

  return (
    <Shell
      title="Görev"
      right={
        done ? (
          <AppText variant="meta" style={{ color: c.focus }}>
            Tamamlandı
          </AppText>
        ) : undefined
      }
    >
      <TaskForm
        initial={task}
        openMustDoCount={day.data?.mustDo.length ?? 0}
        submitLabel="Değişiklikleri kaydet"
        onSubmit={submit}
        busy={update.isPending}
        error={error}
        footer={
          <View style={{ gap: space.sm, marginTop: space.xs }}>
            <Button
              label={done ? 'Görevi geri aç' : 'Görevi tamamla'}
              variant="secondary"
              icon={done ? 'refresh-outline' : 'checkmark-circle-outline'}
              loading={toggle.isPending}
              onPress={() => {
                setError(null);
                toggle.mutate(
                  { id: task.id, done: !done },
                  {
                    onSuccess: () => toast(!done ? 'Görev tamamlandı' : 'Görev geri açıldı', 'info'),
                    onError: (cause) => {
                      setError(cause instanceof Error ? cause.message : 'Görev güncellenemedi.');
                    },
                  },
                );
              }}
            />

            {confirming ? (
              <View
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.danger,
                  borderRadius: radius.md,
                  padding: space.md,
                  gap: space.sm,
                }}
              >
                <AppText variant="body">Bu görev kalıcı olarak silinecek.</AppText>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button
                    label="Vazgeç"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => setConfirming(false)}
                  />
                  <Button
                    label="Sil"
                    variant="danger"
                    style={{ flex: 1 }}
                    loading={remove.isPending}
                    onPress={() => {
                      setError(null);
                      remove.mutate(task.id, {
                        onSuccess: () => {
                          toast('Görev silindi', 'info');
                          dismissToRoot();
                        },
                        onError: (cause) => {
                          setError(cause instanceof Error ? cause.message : 'Görev silinemedi.');
                        },
                      });
                    }}
                  />
                </View>
              </View>
            ) : (
              <Button
                label="Görevi sil"
                variant="danger"
                icon="trash-outline"
                onPress={() => setConfirming(true)}
              />
            )}
          </View>
        }
      />
    </Shell>
  );
}

function Shell({
  title = 'Görev',
  right,
  children,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title={title} right={right} />
      {children}
    </View>
  );
}
