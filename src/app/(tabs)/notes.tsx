import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ScreenIntro, AppText } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/EmptyState';
import { useTheme } from '@/ui/theme';

/**
 * Notes: bağlantılı not ağı. Hafta 0: liste iskeleti.
 * Arama henüz yok — çalışmayan bir input göstermek yerine niyeti açıkça yazar.
 */
export default function NotesScreen() {
  const { c, space, radius } = useTheme();

  return (
    <Screen>
      <ScreenIntro title="Notes" subtitle="Düşüncelerin birbirine ne kadar bağlı?" />

      <View
        accessible
        accessibilityLabel="Arama yakında: başlık, gövde ve bağlantılarda arama"
        style={{
          marginTop: space.md,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space.sm,
          gap: space.xs,
        }}
      >
        <Ionicons name="search-outline" size={16} color={c.textFaint} />
        <AppText variant="body" faint style={{ flex: 1 }}>
          Ara — başlık, gövde, backlink
        </AppText>
        <AppText variant="meta" faint>
          yakında
        </AppText>
      </View>

      <EmptyState
        headline="Not yok"
        hint="İlk notu yakala. İkincisi geldiğinde [[bağlantı]] kurmaya hazırsın."
      />
    </Screen>
  );
}
