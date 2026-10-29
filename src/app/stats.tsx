import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { SkeletonLines } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { useTheme } from '@/ui/theme';
import { dayKeyLabel } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useStats } from '@/features/stats/queries';
import { ActivityChart } from '@/features/stats/ActivityChart';
import type { RangeDays, StatsSummary } from '@/features/stats/service';

const RANGES: { value: string; label: string }[] = [
  { value: '7', label: '7 gün' },
  { value: '30', label: '30 gün' },
];

function formatMinutes(total: number): string {
  if (total <= 0) return '0 dk';
  if (total < 60) return `${total} dk`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}

/**
 * İstatistik ekranı.
 *
 * Sayılar sunucu değil, cihazdaki SQLite'tan gelir. Amaç yarış değil:
 * kullanıcı "bu hafta ne yaptım" sorusuna tek bakışta cevap görsün.
 */
export default function StatsScreen() {
  const { c, space, radius } = useTheme();
  const router = useRouter();
  const [range, setRange] = useState<RangeDays>(7);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const query = useStats(range);
  const data = query.data;

  const selected = useMemo(() => {
    if (!data) return null;
    return (
      data.points.find((point) => point.dayKey === selectedKey) ??
      data.points[data.points.length - 1] ??
      null
    );
  }, [data, selectedKey]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="İstatistik" subtitle="Odak ve tamamlanan işler" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.xs,
          paddingBottom: space.xxl,
          gap: space.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          value={String(range)}
          segments={RANGES}
          onChange={(value) => {
            haptic('tick');
            setRange(value === '30' ? 30 : 7);
            setSelectedKey(null);
          }}
        />

        {query.isPending ? (
          <View style={{ gap: space.md, paddingTop: space.sm }}>
            <SkeletonLines lines={3} />
            <SkeletonLines lines={5} />
          </View>
        ) : query.isError || !data ? (
          <EmptyState
            headline="İstatistikler okunamadı"
            hint="Veriler cihazda duruyor. Ekranı yeniden açmayı deneyin."
          />
        ) : (
          <>
            <HeroCard data={data} />

            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: radius.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.border,
                padding: space.md,
                gap: space.sm,
                overflow: 'hidden',
              }}
            >
              <View style={styles.cardHeader}>
                <AppText variant="meta" muted style={{ letterSpacing: 1.1 }}>
                  GÜNLÜK ETKİNLİK
                </AppText>
                {data.currentStreak > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: space.xs,
                      paddingVertical: 3,
                      borderRadius: radius.pill,
                      backgroundColor: c.accentSoft,
                    }}
                  >
                    <Ionicons name="flame" size={12} color={c.accent} />
                    <AppText variant="meta" style={{ color: c.accent, fontSize: 11 }}>
                      {data.currentStreak} gün
                    </AppText>
                  </View>
                ) : null}
              </View>

              <ActivityChart
                points={data.points}
                selectedKey={selected?.dayKey ?? null}
                onSelect={(key) => {
                  haptic('tick');
                  setSelectedKey(key);
                }}
              />

              {selected ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: space.sm,
                    paddingTop: space.xs,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.border,
                  }}
                >
                  <AppText variant="meta" muted style={{ flex: 1 }} numberOfLines={1}>
                    {dayKeyLabel(selected.dayKey)}
                  </AppText>
                  <AppText variant="meta" style={{ color: c.text }}>
                    {selected.focusMinutes} dk odak · {selected.tasksDone} görev
                  </AppText>
                </View>
              ) : null}

              <AppText variant="meta" faint style={{ fontSize: 11 }}>
                Çubuk: odak dakikası + görev · Nokta: o gün görev tamamlandı
              </AppText>
            </View>

            <View style={styles.grid}>
              <Metric
                label="ORTALAMA"
                value={formatMinutes(data.avgMinutesPerActiveDay)}
                hint={`${data.activeDays} etkin gün`}
                icon="pulse-outline"
              />
              <Metric
                label="EN İYİ GÜN"
                value={formatMinutes(data.bestDayMinutes)}
                hint={data.bestDayKey ? dayKeyLabel(data.bestDayKey) : 'Henüz yok'}
                icon="trophy-outline"
              />
              <Metric
                label="ODAK BLOĞU"
                value={String(data.totalSessions)}
                hint="Tamamlanan blok"
                icon="timer-outline"
              />
              <Metric
                label="TAMAMLANAN"
                value={String(data.totalTasksDone)}
                hint="Görev"
                icon="checkmark-done-outline"
              />
            </View>

            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: radius.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.border,
                overflow: 'hidden',
              }}
            >
              <View style={{ paddingHorizontal: space.md, paddingTop: space.sm }}>
                <AppText variant="meta" muted style={{ letterSpacing: 1.1 }}>
                  KÜTÜPHANE
                </AppText>
              </View>

              <LibraryRow
                icon="document-text-outline"
                label="Notlar"
                value={`${data.notesCount}`}
                onPress={() => router.push('/notes')}
              />
              <LibraryRow
                icon="bulb-outline"
                label="Fikirler"
                value={`${data.ideaCounts.spark} kıvılcım · ${data.ideaCounts.saved} kayıtlı · ${data.ideaCounts.committed} taahhüt`}
                onPress={() => router.push('/tangent')}
              />
              <LibraryRow
                icon="checkbox-outline"
                label="Açık görevler"
                value={`${data.openTasks}`}
                onPress={() => router.push('/plan')}
              />
            </View>

            <AppText variant="meta" faint style={{ paddingHorizontal: space.xxs }}>
              {data.totalFocusMinutes > 0 || data.totalTasksDone > 0
                ? 'Küçük adımlar birikir. Grafik mükemmellik değil, süreklilik gösterir.'
                : 'Henüz veri yok. Bir odak bloğu bitir ya da bir görevi tamamla; burası kendiliğinden dolar.'}
            </AppText>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HeroCard({ data }: { data: StatsSummary }) {
  const { c, space, radius } = useTheme();
  const empty = data.totalFocusMinutes === 0 && data.totalTasksDone === 0;

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: radius.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        padding: space.lg,
        overflow: 'hidden',
      }}
    >
      <View pointerEvents="none" style={[styles.edge, { backgroundColor: c.edge }]} />
      <AppText variant="meta" muted style={{ letterSpacing: 1.2 }}>
        SON {data.rangeDays} GÜN
      </AppText>
      <AppText variant="display" style={{ color: c.text, fontSize: 40, lineHeight: 46 }}>
        {formatMinutes(data.totalFocusMinutes)}
      </AppText>
      <AppText variant="body" muted>
        {empty
          ? 'İlk bloğu başlatmak için Odak sekmesine geç.'
          : `${data.totalSessions} odak bloğu · ${data.totalTasksDone} tamamlanan görev`}
      </AppText>
    </View>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { c, space, radius } = useTheme();

  return (
    <View
      style={{
        flexBasis: '46%',
        flexGrow: 1,
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        padding: space.md,
        gap: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={14} color={c.accent} />
        <AppText variant="meta" faint style={{ fontSize: 10, letterSpacing: 0.8 }}>
          {label}
        </AppText>
      </View>
      <AppText variant="section" style={{ color: c.text }}>
        {value}
      </AppText>
      <AppText variant="meta" muted style={{ fontSize: 11 }} numberOfLines={1}>
        {hint}
      </AppText>
    </View>
  );
}

function LibraryRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const { c, space } = useTheme();

  return (
    <Pressable
      onPress={() => {
        haptic('tick');
        onPress();
      }}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        minHeight: 52,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.border,
        cursor: 'pointer',
      }}
    >
      <Ionicons name={icon} size={17} color={c.textMuted} />
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="meta" muted numberOfLines={1} style={{ maxWidth: '58%', textAlign: 'right' }}>
        {value}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth * 2,
  },
});
