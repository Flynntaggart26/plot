import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenIntro, AppText } from '@/ui/components/Screen';
import { EmptyState } from '@/ui/components/EmptyState';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { SkeletonList } from '@/ui/components/Skeleton';
import { useTheme } from '@/ui/theme';
import { usePressScale, useReduceMotion } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import { useIdeas } from '@/features/ideas/queries';
import { IDEA_STATUS_LABELS, type IdeaStatus } from '@/features/ideas/service';
import { QuickSpark } from '@/features/ideas/QuickSpark';
import type { Idea } from '@/db/schema';

type Filter = 'all' | IdeaStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'spark', label: 'Kıvılcım' },
  { value: 'saved', label: 'Kaydedildi' },
  { value: 'committed', label: 'Taahhüt' },
  { value: 'archived', label: 'Arşiv' },
];

/**
 * Tangent: yakalanan fikirlerin listesi.
 *
 * Fikirler kıvılcım olarak doğar; liste onları olgunlaşmaya zorlamaz.
 * Üstteki tek satırlık alan, form açmadan yakalamayı sağlar.
 */
export default function TangentScreen() {
  const { c, space } = useTheme();
  const reduced = useReduceMotion();
  const ideas = useIdeas();
  const [filter, setFilter] = useState<Filter>('all');

  const all = useMemo(() => ideas.data ?? [], [ideas.data]);
  const counts = useMemo(() => {
    const next: Record<Filter, number> = {
      all: all.length,
      spark: 0,
      saved: 0,
      committed: 0,
      archived: 0,
    };
    for (const idea of all) next[idea.status as IdeaStatus] += 1;
    return next;
  }, [all]);

  const rows = useMemo(
    () => (filter === 'all' ? all : all.filter((idea) => idea.status === filter)),
    [all, filter],
  );

  if (ideas.isPending) {
    return (
      <Screen>
        <ScreenIntro title="Fikirler" subtitle="Fikirler yükleniyor..." />
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.xs }}>
          <SkeletonList rows={4} />
        </View>
      </Screen>
    );
  }

  if (ideas.isError) {
    return (
      <Screen>
        <ScreenIntro title="Fikirler" subtitle="Kafanda döneni buraya dök." />
        <EmptyState
          headline="Fikirler okunamadı"
          hint="Uygulamayı yeniden açmayı deneyin; fikirler cihazda duruyor."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenIntro
        title="Fikirler"
        subtitle={
          all.length === 0
            ? 'Kafanda döneni buraya dök.'
            : `${all.length} fikir — hepsi olgunlaşmak zorunda değil`
        }
      />

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.sm }}>
        <QuickSpark />

        {all.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.xs }}
            accessibilityRole="tablist"
            accessibilityLabel="Fikir durumuna göre filtrele"
          >
            {FILTERS.map((item) => (
              <Chip
                key={item.value}
                label={`${item.label}${counts[item.value] > 0 ? ` · ${counts[item.value]}` : ''}`}
                selected={filter === item.value}
                role="button"
                onPress={() => setFilter(item.value)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {all.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="bulb-outline" size={28} color={c.textFaint} />}
          headline="Henüz fikir yok"
          hint="Yukarıdaki alana yazıp Enter'a bas. Kıvılcım olarak kalmak da yeter."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="funnel-outline" size={28} color={c.textFaint} />}
          headline="Bu durumda fikir yok"
          hint={`${IDEA_STATUS_LABELS[filter as IdeaStatus]} filtresinde bir şey yok. Filtreyi değiştir ya da yeni bir kıvılcım yakala.`}
          action={
            <Button label="Tümünü göster" variant="secondary" onPress={() => setFilter('all')} />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingTop: space.xs,
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
          <View style={[styles.edge, { backgroundColor: c.edge }]} pointerEvents="none" />

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
