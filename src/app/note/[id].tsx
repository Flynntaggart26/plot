import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { dismissToRoot } from '@/lib/navigation';
import { toast } from '@/lib/toast';
import { useCreateNote, useDeleteNote, useNote, useNotes, useUpdateNote } from '@/features/notes/queries';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { NoteBody } from '@/features/notes/NoteBody';
import { NoteLinksSection } from '@/features/notes/NoteLinks';
import { normalizeTitle } from '@/features/notes/link-utils';
import { space } from '@/ui/tokens';

/**
 * Not detayı iki modda çalışır: okuma (varsayılan) ve düzenleme.
 * Böylece `[[bağlantı]]`lar tıklanabilir kalır; kaydetmek ekrandan
 * çıkmayı gerektirmez.
 */
export default function NoteDetail() {
  const { c, space: sp, radius } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { data: note, isLoading } = useNote(id);
  const { data: allNotes } = useNotes();
  const updateNote = useUpdateNote(id ?? '');
  const deleteNote = useDeleteNote();
  const createNote = useCreateNote();

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  /** Gövdedeki [[başlık]]ları not kimliğine çeviren indeks. */
  const titleIndex = useMemo(() => {
    const index = new Map<string, string>();
    for (const item of allNotes ?? []) {
      const key = normalizeTitle(item.title);
      if (!index.has(key)) index.set(key, item.id);
    }
    return index;
  }, [allNotes]);

  const openNote = useCallback(
    (targetId: string) => {
      haptic('light');
      router.push({ pathname: '/note/[id]', params: { id: targetId } });
    },
    [router],
  );

  const handleSave = useCallback(
    (values: { title: string; bodyMd: string }) => {
      setError(null);
      updateNote.mutate(values, {
        onSuccess: () => {
          haptic('success');
          toast('Not güncellendi');
          setEditing(false);
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Not kaydedilemedi.');
        },
      });
    },
    [updateNote],
  );

  const createFromLink = useCallback(
    (title: string) => {
      const clean = title.trim();
      if (!clean) return;
      createNote.mutate(
        { title: clean },
        {
          onSuccess: (created) => {
            haptic('success');
            toast('Not oluşturuldu');
            router.push({ pathname: '/note/[id]', params: { id: created.id } });
          },
          onError: (cause) => {
            setError(cause instanceof Error ? cause.message : 'Not oluşturulamadı.');
          },
        },
      );
    },
    [createNote, router],
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

  const subtitle = new Date(note.updatedAt).toLocaleDateString('tr-TR');

  return (
    <Shell
      subtitle={subtitle}
      right={
        <Pressable
          onPress={() => {
            haptic('tick');
            setError(null);
            setEditing((value) => !value);
          }}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Düzenlemeyi bırak' : 'Notu düzenle'}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: sp.xxs,
            paddingHorizontal: sp.sm,
            borderRadius: radius.pill,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            backgroundColor: c.surface,
          }}
        >
          <Ionicons
            name={editing ? 'close' : 'create-outline'}
            size={15}
            color={editing ? c.textMuted : c.accent}
          />
          <AppText
            variant="meta"
            style={{ color: editing ? c.textMuted : c.accent }}
          >
            {editing ? 'Vazgeç' : 'Düzenle'}
          </AppText>
        </Pressable>
      }
    >
      {editing ? (
        <NoteEditor
          noteId={note.id}
          initialTitle={note.title}
          initialBody={note.bodyMd}
          onSave={handleSave}
          busy={updateNote.isPending}
          error={error}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: sp.lg,
            paddingTop: sp.sm,
            paddingBottom: sp.xxl,
            gap: sp.lg,
          }}
        >
          <View style={{ gap: sp.xxs }}>
            <AppText variant="display">{note.title}</AppText>
            <AppText variant="meta" faint>
              {subtitle}
            </AppText>
          </View>

          <NoteBody body={note.bodyMd} titleIndex={titleIndex} onOpenNote={openNote} />

          <NoteLinksSection
            noteId={note.id}
            onOpenNote={openNote}
            onCreateNote={createFromLink}
          />

          {error ? (
            <View
              style={{
                backgroundColor: c.surface,
                borderColor: c.danger,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: radius.md,
                padding: sp.md,
              }}
              accessibilityRole="alert"
            >
              <AppText variant="body" style={{ color: c.danger }}>
                {error}
              </AppText>
            </View>
          ) : null}

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
                          toast('Not silindi', 'info');
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
        </ScrollView>
      )}
    </Shell>
  );
}

function Shell({
  subtitle,
  right,
  children,
}: {
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Not" subtitle={subtitle} right={right} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingTop: space.xs,
  },
});
