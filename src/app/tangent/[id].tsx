import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { dismissToRoot } from '@/lib/navigation';
import { toast } from '@/lib/toast';
import { IdeaForm, type IdeaFormValues } from '@/features/ideas/IdeaForm';
import { useDeleteIdea, useIdea, useUpdateIdea } from '@/features/ideas/queries';
import { IDEA_STATUS_LABELS } from '@/features/ideas/service';
import { useCreateTask } from '@/features/tasks/queries';
import { useCreateNote } from '@/features/notes/queries';

/**
 * Fikir detayı: başlık, detay, ilk adım ve durum burada düzenlenir.
 * Silme, görev detayındaki gibi iki adımlı satır içi onayla yapılır.
 */
export default function IdeaDetail() {
  const { space, radius, c } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const ideaQuery = useIdea(id);
  const update = useUpdateIdea(id ?? '');
  const remove = useDeleteIdea();
  const createTask = useCreateTask();
  const createNote = useCreateNote();

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const idea = ideaQuery.data ?? null;

  const detailText = (() => {
    if (!idea) return '';
    return [idea.body?.trim(), idea.firstStep ? `İlk adım: ${idea.firstStep}` : null]
      .filter(Boolean)
      .join('\n\n');
  })();

  const convertToTask = () => {
    if (!idea) return;
    setError(null);
    update.mutate(
      { status: 'committed' },
      {
        onSuccess: () => {
          createTask.mutate(
            { title: idea.title, notes: detailText || null },
            {
              onSuccess: (task) => {
                haptic('success');
                toast('Fikir göreve dönüştürüldü');
                router.replace({ pathname: '/task/[id]', params: { id: task.id } });
              },
              onError: (cause) => {
                setError(cause instanceof Error ? cause.message : 'Görev oluşturulamadı.');
              },
            },
          );
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Fikir güncellenemedi.');
        },
      },
    );
  };

  const convertToNote = () => {
    if (!idea) return;
    setError(null);
    update.mutate(
      { status: 'committed' },
      {
        onSuccess: () => {
          const bodyMd = detailText
            ? `${detailText}\n\n#fikir`
            : 'Bu fikir bir not olarak açıldı.';
          createNote.mutate(
            { title: idea.title, bodyMd, folder: 'inbox' },
            {
              onSuccess: (note) => {
                haptic('success');
                toast('Fikir nota dönüştürüldü');
                router.replace({ pathname: '/note/[id]', params: { id: note.id } });
              },
              onError: (cause) => {
                setError(cause instanceof Error ? cause.message : 'Not oluşturulamadı.');
              },
            },
          );
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Fikir güncellenemedi.');
        },
      },
    );
  };

  const converting = update.isPending || createTask.isPending || createNote.isPending;

  const submit = (values: IdeaFormValues) => {
    if (!id) return;
    setError(null);
    update.mutate(
      {
        title: values.title,
        body: values.body,
        firstStep: values.firstStep,
        status: values.status,
      },
      {
        onSuccess: () => {
          haptic('success');
          toast('Fikir güncellendi');
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Fikir kaydedilemedi.');
        },
      },
    );
  };

  if (ideaQuery.isPending) {
    return (
      <Shell>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      </Shell>
    );
  }

  if (!idea) {
    return (
      <Shell>
        <View style={{ padding: space.lg, gap: space.xs }}>
          <AppText variant="section">Fikir bulunamadı</AppText>
          <AppText variant="body" muted>
            Silinmiş ya da hiç var olmamış olabilir.
          </AppText>
        </View>
      </Shell>
    );
  }

  return (
    <Shell subtitle={IDEA_STATUS_LABELS[idea.status]}>
      <IdeaForm
        initial={idea}
        showStatus
        submitLabel="Değişiklikleri kaydet"
        onSubmit={submit}
        busy={update.isPending}
        error={error}
        footer={
          <View style={{ gap: space.sm, marginTop: space.xs }}>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label="Göreve dönüştür"
                variant="secondary"
                icon="checkbox-outline"
                style={{ flex: 1 }}
                loading={converting}
                onPress={convertToTask}
              />
              <Button
                label="Nota dönüştür"
                variant="secondary"
                icon="document-text-outline"
                style={{ flex: 1 }}
                loading={converting}
                onPress={convertToNote}
              />
            </View>
            <AppText variant="meta" faint>
              Dönüştürmek fikri silmez; durumu “Taahhüt” olur ve yeni kayda bağlanır.
            </AppText>

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
                <AppText variant="body">Bu fikir kalıcı olarak silinecek.</AppText>
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
                      remove.mutate(idea.id, {
                        onSuccess: () => {
                          toast('Fikir silindi', 'info');
                          dismissToRoot();
                        },
                        onError: (cause) => {
                          setError(cause instanceof Error ? cause.message : 'Fikir silinemedi.');
                        },
                      });
                    }}
                  />
                </View>
              </View>
            ) : (
              <Button
                label="Fikri sil"
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

function Shell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Fikir" subtitle={subtitle} />
      {children}
    </View>
  );
}
