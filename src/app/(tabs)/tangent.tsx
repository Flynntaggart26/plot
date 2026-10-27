import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Screen, ScreenIntro, AppText } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/EmptyState';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { useIdeas } from '@/features/ideas/queries';
import { IDEA_STATUS_LABELS } from '@/features/ideas/service';

/**
 * Tangent: yakalanan fikirlerin listesi.
 * Fikirler kıvılcım olarak doğar; liste onları olgunlaşmaya zorlamaz.
 */
export default function TangentScreen() {
  const { c, space, radius } = useTheme();
  const ideas = useIdeas();

  if (ideas.isPending) {
    return (
      <Screen>
        <ScreenIntro title="Tangent" subtitle="Fikirler yükleniyor..." />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      </Screen>
    );
  }

  if (ideas.isError) {
    return (
      <Screen>
        <ScreenIntro title="Tangent" subtitle="Kafamda döneni buraya dök." />
        <EmptyState
          headline="Fikirler okunamadı"
          hint="Uygulamayı yeniden açmayı deneyin; fikirler cihazda duruyor."
        />
      </Screen>
    );
  }

  const rows = ideas.data ?? [];

  return (
    <Screen>
      <ScreenIntro
        title="Tangent"
        subtitle={
          rows.length === 0
            ? 'Kafamda döneni buraya dök.'
            : `${rows.length} fikir · hepsi olgunlaşmak zorunda değil`
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="bulb-outline" size={28} color={c.textFaint} />}
          headline="Henüz fikir yok"
          hint="Aklına geleni yakala; sonra bakarsın. Kıvılcım olarak kalmak da yeter."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingBottom: space.xxl,
            gap: space.xs,
          }}
        >
          {rows.map((idea) => (
            <TouchableOpacity
              key={idea.id}
              onPress={() => {
                haptic('light');
                router.push({ pathname: '/tangent/[id]', params: { id: idea.id } });
              }}
              accessible
              accessibilityRole="link"
              accessibilityLabel={`Fikri aç: ${idea.title}`}
              style={{ paddingVertical: space.xs }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  paddingVertical: space.sm,
                  paddingHorizontal: space.md,
                  backgroundColor: c.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                  borderRadius: radius.md,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.sm,
                    backgroundColor: c.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="bulb-outline" size={20} color={c.accent} />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {idea.title}
                  </AppText>
                  <AppText variant="meta" muted numberOfLines={1}>
                    {IDEA_STATUS_LABELS[idea.status]} ·{' '}
                    {idea.firstStep
                      ? `İlk adım: ${idea.firstStep}`
                      : idea.body || 'Henüz detay yok'}
                  </AppText>
                </View>

                <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Button
        label="Yeni Fikir"
        icon="bulb-outline"
        onPress={() => {
          haptic('medium');
          router.push('/tangent/new');
        }}
      />
    </Screen>
  );
}
