import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, ScreenIntro } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/EmptyState';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { useNotes, useCreateNote, useUpdateNote } from '@/features/notes/queries';
import { NoteEditor } from '@/features/notes/NoteEditor';
import type { Note } from '@/db/schema';
import { space as sp } from '@/ui/tokens';

export default function NotesScreen() {
  const { c, radius: rad } = useTheme();
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteOpen, setNewNoteOpen] = useState(false);

  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote(editingNote?.id ?? '');

  const handleSave = useCallback(
    (values: { title: string; bodyMd: string }) => {
      createNote.mutate(values, {
        onSuccess: () => {
          setNewNoteOpen(false);
          haptic('success');
        },
      });
    },
    [createNote],
  );

  const handleUpdate = useCallback(
    (values: { title: string; bodyMd: string }) => {
      if (!editingNote) return;
      updateNote.mutate(values, {
        onSuccess: () => {
          setEditingNote(null);
          haptic('success');
        },
      });
    },
    [editingNote, updateNote],
  );

  const openEditor = (note: Note | null) => {
    haptic('light');
    setEditingNote(note ?? null);
  };

  const sortedNotes = useMemo(() => {
    if (!notes) return [];
    return [...notes].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [notes]);

  if (isLoading) {
    return (
      <Screen>
        <ScreenIntro title="Notlar" subtitle="Notlarınız yükleniyor..." />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.textMuted }}>Yükleniyor...</Text>
        </View>
      </Screen>
    );
  }

  const noteRowStyle: ViewStyle = {
    paddingVertical: sp.xs,
    paddingHorizontal: sp.lg,
  };

  const noteRowContentStyle: ViewStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: sp.sm,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: rad.md,
  };

  const noteRowTextStyle: ViewStyle = {
    flex: 1,
  };

  const noteTitleStyle: TextStyle = {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  };

  const noteMetaStyle: TextStyle = {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  };

  return (
    <Screen>
      <ScreenIntro
        title="Notlar"
        subtitle={sortedNotes.length + ' not · [[Başlık]] ile bağlantı kurabilirsiniz'}
      />

      {sortedNotes.length === 0 ? (
        <EmptyState
          headline="Not yok"
          hint="İlk notunuzu oluşturun. İkincisi geldiğinde [[bağlantı]] kurmaya başlayabilirsiniz."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: sp.lg,
            paddingBottom: sp.xxl,
            gap: sp.xs,
          }}
        >
          {sortedNotes.map((note) => (
            <TouchableOpacity
              key={note.id}
              onPress={() => openEditor(note)}
              accessible
              accessibilityRole="link"
              accessibilityLabel={note.title}
              style={noteRowStyle}
            >
              <View style={noteRowContentStyle}>
                <Ionicons name="document-text-outline" size={20} color={c.textMuted} />
                <View style={noteRowTextStyle}>
                  <Text style={[noteTitleStyle, { color: c.text }]}>
                    {note.title}
                  </Text>
                  <Text style={[noteMetaStyle, { color: c.textMuted }]}>
                    {new Date(note.updatedAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Button
        label="Yeni Not"
        icon="create-outline"
        onPress={() => {
          haptic('medium');
          setNewNoteOpen(true);
        }}
      />

      {newNoteOpen && (
        <NoteEditor
          initialTitle=""
          initialBody=""
          onSave={handleSave}
          busy={createNote.isPending}
        />
      )}

      {editingNote && (
        <NoteEditor
          noteId={editingNote.id}
          initialTitle={editingNote.title}
          initialBody={editingNote.bodyMd}
          onSave={handleUpdate}
          busy={updateNote.isPending}
        />
      )}
    </Screen>
  );
}