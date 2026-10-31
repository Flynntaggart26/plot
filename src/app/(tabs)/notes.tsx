import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenIntro, AppText } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/EmptyState';
import { Button } from '@/ui/components/Button';
import { SkeletonList } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';
import { usePressScale, useReduceMotion } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import { useNotes } from '@/features/notes/queries';
import { searchNoteList } from '@/features/notes/link-utils';
import type { Note } from '@/db/schema';
import { space as sp } from '@/ui/tokens';

/**
 * Notlar listesi. Düzenleme ve silme tek bir yerde — `/note/[id]` —
 * yapılır; böylece liste ekranı yalnızca gezinir, iki ayrı editör
 * davranışı doğmaz.
 */
export default function NotesScreen() {
  const { c, radius: rad } = useTheme();
  const reduced = useReduceMotion();
  const { data: notes, isLoading } = useNotes();
  const [query, setQuery] = useState('');

  const sortedNotes = useMemo(() => {
    if (!notes) return [];
    return [...notes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [notes]);

  const results = useMemo(() => searchNoteList(sortedNotes, query), [sortedNotes, query]);
  const searching = query.trim().length > 0;

  if (isLoading) {
    return (
      <Screen>
        <ScreenIntro title="Notlar" subtitle="Notlarınız yükleniyor..." />
        <View style={{ paddingHorizontal: sp.lg, paddingTop: sp.xs }}>
          <SkeletonList rows={4} />
        </View>
      </Screen>
    );
  }

  if (sortedNotes.length === 0) {
    return (
      <Screen>
        <ScreenIntro title="Notlar" subtitle="0 not · [[Başlık]] ile bağlantı kurabilirsiniz" />
        <EmptyState
          icon={<Ionicons name="document-text-outline" size={28} color={c.textFaint} />}
          headline="Henüz not yok"
          hint="İlk notunu yaz. İkincisi geldiğinde [[bağlantı]] kurmaya başlayabilirsin."
          action={
            <Button
              label="İlk notu yaz"
              variant="secondary"
              icon="create-outline"
              onPress={() => {
                haptic('medium');
                router.push('/note/new');
              }}
            />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenIntro
        title="Notlar"
        subtitle={
          searching
            ? `${results.length} sonuç · "${query.trim()}"`
            : sortedNotes.length + ' not · [[Başlık]] ile bağlantı kurabilirsiniz'
        }
      />

      <View
        style={{
          marginHorizontal: sp.lg,
          marginTop: sp.sm,
          marginBottom: sp.xs,
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.xs,
          paddingHorizontal: sp.sm,
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          borderRadius: rad.md,
        }}
      >
        <Ionicons name="search" size={16} color={c.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Notlarda ara"
          placeholderTextColor={c.textFaint}
          selectionColor={c.accent}
          accessibilityLabel="Notlarda ara"
          style={{
            flex: 1,
            paddingVertical: sp.sm,
            color: c.text,
            fontSize: 15,
          }}
        />
        {searching ? (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Aramayı temizle"
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close-circle" size={18} color={c.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {searching && results.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="search-outline" size={28} color={c.textFaint} />}
          headline="Eşleşme yok"
          hint="Başlıkta ya da gövdede geçen başka bir kelime deneyin."
          action={
            <Button
              label="Aramayı temizle"
              variant="secondary"
              icon="close-outline"
              onPress={() => setQuery('')}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: sp.lg,
            paddingBottom: sp.xxl,
            gap: sp.xs,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {results.map(({ note, excerpt }, index) => (
            <Animated.View
              key={note.id}
              entering={
                reduced ? undefined : FadeInDown.duration(240).delay(Math.min(index, 6) * 40)
              }
            >
              <NoteRow note={note} excerpt={searching ? excerpt : null} />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function NoteRow({ note, excerpt }: { note: Note; excerpt: string | null }) {
  const { c, radius: rad } = useTheme();
  const { style, handlers } = usePressScale();
  const [hovered, setHovered] = useState(false);

  return (
    <Animated.View style={style}>
      <Pressable
        {...handlers}
        onPress={() => {
          haptic('light');
          router.push({ pathname: '/note/[id]', params: { id: note.id } });
        }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessible
        accessibilityRole="link"
        accessibilityLabel={note.title}
        style={[rowStyle, { cursor: 'pointer' }]}
      >
        <View
          style={[
            rowContentStyle,
            {
              backgroundColor: hovered ? c.surfaceRaised : c.surface,
              borderColor: hovered ? c.borderStrong : c.border,
              borderRadius: rad.md,
            },
          ]}
        >
          <View pointerEvents="none" style={[styles.edge, { backgroundColor: c.edge }]} />
          <Ionicons
            name="document-text-outline"
            size={20}
            color={hovered ? c.accent : c.textMuted}
          />
          <View style={textWrapStyle}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {note.title}
            </AppText>
            {excerpt ? (
              <AppText variant="meta" muted numberOfLines={1}>
                {excerpt}
              </AppText>
            ) : (
              <AppText variant="meta" muted>
                {new Date(note.updatedAt).toLocaleDateString('tr-TR')}
              </AppText>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={hovered ? c.textMuted : c.textFaint} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const rowStyle: ViewStyle = {
  paddingVertical: sp.xs,
  paddingHorizontal: sp.lg,
};

const rowContentStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: sp.sm,
  paddingVertical: sp.sm,
  paddingHorizontal: sp.md,
  borderWidth: StyleSheet.hairlineWidth,
  overflow: 'hidden',
};

const textWrapStyle: ViewStyle = {
  flex: 1,
};

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: StyleSheet.hairlineWidth * 2,
  },
});
