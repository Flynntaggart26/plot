import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { useIdeas } from '@/features/ideas/queries';
import { IDEA_STATUS_LABELS } from '@/features/ideas/service';
import type { Idea } from '@/db/schema';

/**
 * Tangent: yakalanan fikirlerin listesi.
 * Fikirler kıvılcım olarak doğar; liste onları olgunlaşmaya zorlamaz.
 */
export default function TangentScreen() {
  const { c, space } = useTheme();
  const reduced = useReduceMotion();
  const ideas = useIdeas();

  if (ideas.isPending) {
    return (
      <Screen>
        <ScreenIntro title="Tangent" subtitle="Fikirler yükleniyor..." />
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.xs }}>
          <SkeletonList rows={4} />
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
          action={
            <Button
              label="Fikir yakala"
              variant="secondary"
              icon="bulb-outline"
              onPress={() => {
                haptic('medium');
                router.push('/tangent/new');
              }}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingBottom: space.xxl,
            gap: space.xs,
          }}
        >
          {rows.map((idea, index) => (
            <Animated.View
              key={idea.id}
              entering={
                reduced ? undefined : FadeInDown.duration(240).delay(Math.min(index, 6) * 40)
              }
            >
              <IdeaRow idea={idea} />
            </Animated.View>
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

function IdeaRow({ idea }: { idea: Idea }) {
  const { c, space, radius } = useTheme();
  const { style, handlers } = usePressScale();
  const [hovered, setHovered] = useState(false);

  return (
    <Animated.View style={style}>
      <Pressable
        {...handlers}
        onPress={() => {
          haptic('light');
          router.push({ pathname: '/tangent/[id]', params: { id: idea.id } });
        }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessible
        accessibilityRole="link"
        accessibilityLabel={`Fikri aç: ${idea.title}`}
        style={{ paddingVertical: space.xs, cursor: 'pointer' }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            backgroundColor: hovered ? c.surfaceRaised : c.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: hovered ? c.borderStrong : c.border,
            borderRadius: radius.md,
            overflow: 'hidden',
          }}
        >
          <View
            style={[styles.edge, { backgroundColor: c.edge }]}
            pointerEvents="none"
          />

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
              {idea.firstStep ? `İlk adım: ${idea.firstStep}` : idea.body || 'Henüz detay yok'}
            </AppText>
          </View>

          <Ionicons name="chevron-forward" size={16} color={hovered ? c.textMuted : c.textFaint} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: StyleSheet.hairlineWidth * 2,
  },
});
