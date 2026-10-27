import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { dismissToRoot } from '@/lib/navigation';
import { useDeleteNote, useNote, useUpdateNote } from '@/features/notes/queries';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { space } from '@/ui/tokens';

/**
 * Not detayı: düzenleme ve silme tek yerde. Silme iki adımlı — görev ve
 * fikir detaylarındaki satır içi onayla aynı davranış.
 */
export default function NoteDetail() {
  const { c, space: sp, radius } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: note, isLoading } = useNote(id);
  const updateNote = useUpdateNote(id ?? '');
  const deleteNote = useDeleteNote();

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleSave = useCallback(
    (values: { title: string; bodyMd: string }) => {
      setError(null);
      updateNote.mutate(values, {
        onSuccess: () => {
          haptic('success');
          dismissToRoot();
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Not kaydedilemedi.');
        },
      });
    },
    [updateNote],
  );

  if (isLoading) {
    return (
      <Shell subtitle="Yükleniyor...">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      </Shell>
    );
  }

  if (!note) {
    return (
      <Shell>
        <View style={{ padding: sp.lg, gap: sp.xs }}>
          <AppText variant="section">Not bulunamadı</AppText>
          <AppText variant="body" muted>
            Silinmiş ya da hiç var olmamış olabilir.
          </AppText>
        </View>
      </Shell>
    );
  }

  return (
    <Shell subtitle={new Date(note.updatedAt).toLocaleDateString('tr-TR')}>
      <NoteEditor
        noteId={note.id}
        initialTitle={note.title}
        initialBody={note.bodyMd}
        onSave={handleSave}
        busy={updateNote.isPending}
        error={error}
      />

      <View style={styles.actions}>
        {confirming ? (
          <View
            style={{
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.danger,
              borderRadius: radius.md,
              padding: sp.md,
              gap: sp.sm,
            }}
          >
            <AppText variant="body">Bu not kalıcı olarak silinecek.</AppText>
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
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
                loading={deleteNote.isPending}
                onPress={() => {
                  setError(null);
                  deleteNote.mutate(note.id, {
                    onSuccess: () => {
                      haptic('success');
                      dismissToRoot();
                    },
                    onError: (cause) => {
                      setError(cause instanceof Error ? cause.message : 'Not silinemedi.');
                    },
                  });
                }}
              />
            </View>
          </View>
        ) : (
          <Button
            label="Notu sil"
            variant="danger"
            icon="trash-outline"
            onPress={() => setConfirming(true)}
          />
        )}
      </View>
    </Shell>
  );
}

function Shell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Not" subtitle={subtitle} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
    paddingTop: space.xs,
  },
});
