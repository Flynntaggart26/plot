import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { createFocusSession, endFocusSession, getFocusStats } from '@/features/focus/service';
const TOTAL_SEC = 25 * 60;
const RING_SIZE = 280;
const RING_T = 16;
const RING_R = (RING_SIZE - RING_T - 24) / 2;
const FULL_DASH = 2 * Math.PI * RING_R;
const RING_C = RING_SIZE / 2;
function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

/** İstatistik okuması ikincil: başarısız olursa ekran çalışmaya devam eder. */
function readFocusStats() {
  try {
    return getFocusStats();
  } catch {
    return null;
  }
}
export default function FocusScreen() {
  const { c, space } = useTheme();
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SEC);
  const sessionIdRef = useRef<string | null>(null);
  const progress = timeLeft / TOTAL_SEC;
  const dashOffset = FULL_DASH * (1 - progress);
  // Okuma başarısız olursa ekranı düşürmeyelim: istatistik ikincil bilgi.
  /* eslint-disable react-hooks/exhaustive-deps -- isCompleted kasıtlı yenileme tetikleyicisi */
  const stats = useMemo(() => readFocusStats(), [isCompleted]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setIsActive(false);
          setIsCompleted(true);
          haptic('success');
          if (sessionIdRef.current) {
            try {
              endFocusSession(sessionIdRef.current, { actualMin: 25, endedAt: new Date().toISOString() });
            } catch { /* yoksay */ }
            sessionIdRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);
  const startTimer = useCallback(() => {
    if (isActive) return;
    haptic('medium');
    setIsCompleted(false);
    if (timeLeft <= 0) setTimeLeft(TOTAL_SEC);
    try {
      const s = createFocusSession({ plannedMin: 25, mood: null });
      sessionIdRef.current = s.id;
    } catch { sessionIdRef.current = null; }
    setIsActive(true);
  }, [isActive, timeLeft]);
  const pauseTimer = useCallback(() => { haptic('light'); setIsActive(false); }, []);
  const resetTimer = useCallback(() => {
    haptic('light');
    setIsActive(false);
    setIsCompleted(false);
    setTimeLeft(TOTAL_SEC);
    if (sessionIdRef.current) {
      try {
        endFocusSession(sessionIdRef.current, { actualMin: Math.max(0, 25 - Math.ceil(timeLeft / 60)), endedAt: new Date().toISOString() });
      } catch { /* yoksay */ }
      sessionIdRef.current = null;
    }
  }, [timeLeft]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingHorizontal: space.lg }}>
      <View style={{ paddingTop: space.md }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: c.text }}>{isActive ? 'Odakta' : 'Odak'}</Text>
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>
          {isCompleted ? 'Odak süresi tamamlandı!' : isActive ? 'Geri sayım devam ediyor' : '25 dakikalık odak bloğu'}
        </Text>
      </View>
      <View style={{ alignItems: 'center', marginTop: space.lg }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle cx={RING_C} cy={RING_C} r={RING_R} fill="none" stroke={c.border} strokeWidth={RING_T} strokeLinecap="round" />
          <Circle cx={RING_C} cy={RING_C} r={RING_R} fill="none" stroke={isActive ? c.focus : c.accent} strokeWidth={RING_T} strokeLinecap="round" strokeDasharray={FULL_DASH} strokeDashoffset={dashOffset} transform={`rotate(-90 ${RING_C} ${RING_C})`} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 44, fontWeight: '700', color: isActive ? c.focus : c.text }}>{formatTime(timeLeft)}</Text>
          <Text style={{ fontSize: 13, color: c.textMuted }}>dakika</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.md, marginTop: space.lg }}>
        <Pressable style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }} onPress={isActive ? pauseTimer : startTimer} disabled={isCompleted} accessibilityLabel={isActive ? 'Durdur' : 'Başlat'}>
          <Ionicons name={isActive ? 'pause-outline' : 'play-outline'} size={26} color={c.bg} />
        </Pressable>
        <Pressable style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }} onPress={resetTimer} accessibilityLabel="Sıfırla">
          <Ionicons name="refresh-outline" size={22} color={c.textMuted} />
        </Pressable>
      </View>
      {isCompleted && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg, padding: space.md, backgroundColor: c.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: c.focus }}>
          <Ionicons name="checkmark-circle" size={20} color={c.focus} />
          <Text style={{ fontSize: 14, color: c.focus, flex: 1 }}>Odak hedefine ulaştın. Mola vermeye hazır mısın?</Text>
        </View>
      )}
      <View style={{ marginTop: space.lg, paddingHorizontal: space.md }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>Odak İstatistikleri</Text>
        {stats ? (
          <Text style={{ fontSize: 14, color: c.text, marginTop: 4 }}>Toplam oturum: {stats.totalSessions} · Tamamlanan: {stats.completedSessions}</Text>
        ) : (
          <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>İstatistikler okunamadı.</Text>
        )}
      </View>
    </View>
  );
}
