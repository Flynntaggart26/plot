import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { usePressScale } from '@/ui/motion/hooks';
import { haptic } from '@/lib/haptics';
import { timeLabel } from '@/lib/date';
import type { Task } from '@/db/schema';

const ENERGY_LABEL: Record<string, string> = {
  low: 'düşük enerji',
  mid: 'orta enerji',
  high: 'yüksek enerji',
};

/**
 * Tek görev satırı. Sol taraf 44×44 tamamlama hedefi, sağ taraf detay.
 * Tamamlanınca satır kaybolmaz, soluklaşır ve üstü çizilir: yapılan iş
 * görünür kalır, bu bir motivasyon sinyali.
 */
export function TaskRow({
  task,
  onToggle,
  pending = false,
}: {
  task: Task;
  onToggle: (done: boolean) => void;
  pending?: boolean;
}) {
  const { c, space, radius } = useTheme();
  const router = useRouter();
  const { style, handlers } = usePressScale();

  const done = task.status === 'done' || task.status === 'dropped';
  const meta = [
    task.scheduledAt ? timeLabel(task.scheduledAt) : null,
    task.estimateMin ? `${task.estimateMin} dk` : null,
    task.energy ? ENERGY_LABEL[task.energy] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.row, { gap: space.xs, opacity: pending ? 0.7 : 1 }]}>
      <Animated.View style={style}>
        <Pressable
          {...handlers}
          onPress={() => {
            haptic(done ? 'tick' : 'success');
            onToggle(!done);
          }}
          accessible
          accessibilityRole="checkbox"
          accessibilityLabel={done ? `${task.title}: tamamlandı` : `${task.title}: tamamla`}
          aria-checked={done}
          style={[styles.checkTarget, { borderRadius: radius.pill }]}
          hitSlop={2}
        >
          <View
            style={[
              styles.checkCircle,
              {
                borderColor: done ? c.focus : c.borderStrong,
                backgroundColor: done ? c.focusSoft : 'transparent',
              },
            ]}
          >
            {done ? <Ionicons name="checkmark" size={14} color={c.focus} /> : null}
          </View>
        </Pressable>
      </Animated.View>

      <Pressable
        onPress={() => {
          haptic('light');
          router.push(`/task/${task.id}`);
        }}
        accessible
        accessibilityRole="link"
        accessibilityLabel={`${task.title}. Düzenlemek için aç`}
        style={styles.content}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {task.priority === 1 && !done ? (
            <Ionicons name="star" size={12} color={c.accent} />
          ) : null}
          <AppText
            variant="bodyStrong"
            style={{
              flex: 1,
              color: done ? c.textFaint : c.text,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
            numberOfLines={2}
          >
            {task.title}
          </AppText>
        </View>
        {meta ? (
          <AppText variant="meta" faint numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
      </Pressable>

      <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  checkTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    gap: 2,
  },
});
