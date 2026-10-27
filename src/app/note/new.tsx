import React, { useState } from 'react';
import { View } from 'react-native';
import { SubHeader } from '@/ui/components/SubHeader';
import { useTheme } from '@/ui/theme';
import { todayLabel } from '@/lib/date';
import { dismissToRoot } from '@/lib/navigation';
import { toast } from '@/lib/toast';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { useCreateNote } from '@/features/notes/queries';

/**
 * Hızlı not yakalama. Yakalama sheet'inden gelir; kaydedince geldiği
 * ekrana döner, böylece akış bölünmez.
 */
export default function NewNoteScreen() {
  const { c } = useTheme();
  const create = useCreateNote();
  const [error, setError] = useState<string | null>(null);

  const submit = (values: { title: string; bodyMd: string }) => {
    setError(null);
    create.mutate(values, {
      onSuccess: () => {
        toast('Not kaydedildi');
        dismissToRoot();
      },
      onError: (cause) => {
        setError(cause instanceof Error ? cause.message : 'Not kaydedilemedi.');
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Yeni not" subtitle={todayLabel()} />
      <NoteEditor
        initialTitle=""
        initialBody=""
        onSave={submit}
        busy={create.isPending}
        error={error}
      />
    </View>
  );
}
