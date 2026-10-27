import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { normalizeText } from './link-utils';
import { useBacklinks, useNoteLinks, useNotes } from './queries';

/**
 * Not detayının altındaki bağlantı bölümü.
 *
 * Giden linklerde hedef yoksa tek dokunuşla o başlıkla not oluşturulur;
 * gelen linkler (backlink) kaynak nota götürür.
 */
export function NoteLinksSection({
  noteId,
  onOpenNote,
  onCreateNote,
}: {
  noteId: string;
  onOpenNote: (id: string) => void;
  onCreateNote: (title: string) => void;
}) {
  const { c, space: sp, radius } = useTheme();
  const { data: outgoing } = useNoteLinks(noteId);
  const { data: backlinks } = useBacklinks(noteId);

  const links = outgoing ?? [];
  const incoming = backlinks ?? [];
  const empty = links.length === 0 && incoming.length === 0;

  return (
    <View style={{ gap: sp.sm }}>
      <AppText variant="meta" muted style={{ letterSpacing: 1.1 }}>
        BAĞLANTILAR
      </AppText>

      {empty ? (
        <AppText variant="meta" faint>
          [[Başlık]] yazarak notları bağlayın.
        </AppText>
      ) : null}

      {links.length > 0 ? (
        <View style={{ gap: sp.xs }}>
          <AppText variant="meta" faint>
            BU NOTTAN
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.xxs }}>
            {links.map((link) => {
              const resolved = Boolean(link.resolvedId);
              return (
                <Pressable
                  key={link.id}
                  onPress={() => {
                    haptic('light');
                    if (link.resolvedId) {
                      onOpenNote(link.resolvedId);
                    } else {
                      onCreateNote(link.targetTitle);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    resolved
                      ? `${link.targetTitle} notuna git`
                      : `${link.targetTitle} notunu oluştur`
                  }
                  style={({ pressed }: { pressed: boolean }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingVertical: 5,
                    paddingHorizontal: sp.xs,
                    borderRadius: radius.pill,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderStyle: resolved ? 'solid' : 'dashed',
                    borderColor: resolved ? c.accent : c.borderStrong,
                    backgroundColor: pressed ? c.surfaceRaised : c.surface,
                    cursor: 'pointer',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons
                    name={resolved ? 'link-outline' : 'add'}
                    size={13}
                    color={resolved ? c.accent : c.textFaint}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: resolved ? c.accent : c.textMuted,
                    }}
                  >
                    {link.targetTitle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {incoming.length > 0 ? (
        <View style={{ gap: sp.xxs }}>
          <AppText variant="meta" faint>
            BU NOTA
          </AppText>
          {incoming.map((row) => (
            <Pressable
              key={row.link.id}
              onPress={() => {
                haptic('light');
                onOpenNote(row.note.id);
              }}
              accessibilityRole="link"
              accessibilityLabel={`${row.note.title} notuna git`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: sp.xs,
                paddingVertical: sp.xxs,
                cursor: 'pointer',
              }}
            >
              <Ionicons name="arrow-back-outline" size={14} color={c.textFaint} />
              <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {row.note.title}
              </AppText>
              <AppText variant="meta" faint>
                {new Date(row.note.updatedAt).toLocaleDateString('tr-TR')}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Editörden `[[başlık]]` eklemek için not seçici. Arama başlık üzerinde
 * çalışır: link metni başlık olduğu için gövde eşleşmesi burada anlamsız.
 */
export function NotePickerSheet({
  visible,
  excludeId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  excludeId?: string;
  onSelect: (title: string) => void;
  onClose: () => void;
}) {
  const { c, space: sp, radius } = useTheme();
  const { data: notes } = useNotes();
  const [query, setQuery] = useState('');

  const close = () => {
    setQuery('');
    onClose();
  };

  const choose = (title: string) => {
    setQuery('');
    onSelect(title);
  };

  const results = useMemo(() => {
    const needle = normalizeText(query.trim());
    return (notes ?? [])
      .filter((note) => note.id !== excludeId)
      .filter((note) => (needle ? normalizeText(note.title).includes(needle) : true))
      .slice(0, 40);
  }, [notes, excludeId, query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.sheetRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Bağlantı seçimini kapat"
        />

        <View
          style={{
            backgroundColor: c.surfaceRaised,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            paddingTop: sp.md,
            paddingBottom: sp.lg,
            maxHeight: '70%',
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: sp.lg,
              paddingBottom: sp.sm,
            }}
          >
            <AppText variant="section">Bağlantı ekle</AppText>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          <View
            style={{
              marginHorizontal: sp.lg,
              marginBottom: sp.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: sp.xs,
              backgroundColor: c.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.border,
              borderRadius: radius.md,
              paddingHorizontal: sp.sm,
            }}
          >
            <Ionicons name="search" size={16} color={c.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Not ara"
              placeholderTextColor={c.textFaint}
              selectionColor={c.accent}
              autoFocus
              style={{
                flex: 1,
                paddingVertical: sp.sm,
                color: c.text,
                fontSize: 15,
              }}
            />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: sp.lg, gap: sp.xxs }}>
            {results.length === 0 ? (
              <AppText variant="meta" muted style={{ paddingVertical: sp.md }}>
                Eşleşen not yok. Bağlantıyı gövdeye [[Başlık]] yazarak da ekleyebilirsiniz.
              </AppText>
            ) : (
              results.map((note) => (
                <Pressable
                  key={note.id}
                  onPress={() => {
                    haptic('light');
                    choose(note.title);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${note.title} notunu bağla`}
                  style={({ pressed }: { pressed: boolean }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: sp.xs,
                    paddingVertical: sp.sm,
                    paddingHorizontal: sp.xs,
                    borderRadius: radius.sm,
                    backgroundColor: pressed ? c.surface : 'transparent',
                    cursor: 'pointer',
                  })}
                >
                  <Ionicons name="document-text-outline" size={16} color={c.textMuted} />
                  <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                    {note.title}
                  </AppText>
                  <Ionicons name="add" size={16} color={c.accent} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000066',
  },
});
