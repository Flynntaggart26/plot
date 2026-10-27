import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenIntro } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';

import { haptic } from '@/lib/haptics';
import { useNote, useUpdateNote, useDeleteNote } from '@/features/notes/queries';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { space } from '@/ui/tokens';

export default function NoteDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: note, isLoading } = useNote(id);
  const updateNote = useUpdateNote(id!);
  const deleteNote = useDeleteNote();

  const handleSave = useCallback(
    (values: { title: string; bodyMd: string }) => {
      updateNote.mutate(values, {
        onSuccess: () => {
          haptic('success');
          router.back();
        },
      });
    },
    [updateNote, router],
  );

  if (isLoading) {
    return (
      <Screen>
        <ScreenIntro title="Not" subtitle="Yükleniyor..." />
      </Screen>
    );
  }

  if (!note) {
    return (
      <Screen>
        <ScreenIntro title="Not" subtitle="Not bulunamadı." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenIntro
        title={note.title}
        subtitle={new Date(note.updatedAt).toLocaleDateString('tr-TR')}
      />

      <NoteEditor
        noteId={note.id}
        initialTitle={note.title}
        initialBody={note.bodyMd}
        onSave={handleSave}
        busy={updateNote.isPending}
      />

      <View style={styles.actions}>
        <Button
          label="Sil"
          variant="ghost"
          onPress={() => {
            haptic('light');
            deleteNote.mutate(note.id, {
              onSuccess: () => {
                haptic('success');
                router.back();
              },
            });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xxl,
  },
});