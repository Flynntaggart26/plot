import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { listThreads } from '@/features/muse/service';

/**
 * Muse — AI asistanının durumu.
 *
 * Gerçek bir sağlayıcı bağlanana kadar burada sahte bir model/anahtar formu
 * göstermiyoruz: yalnızca ne olduğunu ve verinin nerede kaldığını anlatıyoruz.
 */
export default function AiSettingsScreen() {
  const { c, space, radius } = useTheme();
  const router = useRouter();

  const threads = useMemo(() => {
    try {
      return listThreads();
    } catch {
      return [];
    }
  }, []);

  const lastActive = threads[0]?.updatedAt
    ? new Date(threads[0].updatedAt).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
      })
    : 'Henüz sohbet yok';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Muse" subtitle="AI asistanı" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
          gap: space.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            padding: space.md,
            gap: space.sm,
            borderRadius: radius.card,
            backgroundColor: c.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
            <AppText variant="meta" style={{ color: c.accent, letterSpacing: 1.2 }}>
              MOCK MOD
            </AppText>
          </View>

          <AppText variant="title">Yerel yanıtlar</AppText>
          <AppText variant="body" muted>
            Muse şu an gerçek bir modele bağlı değil. Yanıtlar yerel şablonlardan üretilir ve
            hiçbir istek cihazdan çıkmaz. Sohbet geçmişi cihazdaki SQLite
            veritabanında saklanır.
          </AppText>

          <View
            style={{
              flexDirection: 'row',
              gap: space.lg,
              paddingTop: space.sm,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.border,
            }}
          >
            <Stat label="Sohbet" value={String(threads.length)} />
            <Stat label="Son etkinlik" value={lastActive} />
          </View>
        </View>

        <View style={{ gap: space.xs }}>
          <InfoRow icon="cloud-offline-outline" text="Ağ isteği yok — tamamen çevrimdışı." />
          <InfoRow icon="key-outline" text="Sağlayıcı anahtarı gerekmiyor." />
          <InfoRow
            icon="construct-outline"
            text="Gerçek LLM bağlantısı eklendiğinde model ve maliyet bilgileri burada görünecek."
          />
        </View>

        <Button label="Muse'u aç" icon="sparkles-outline" onPress={() => router.push('/muse')} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="meta" faint>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={{ color: c.text }}>
        {value}
      </AppText>
    </View>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  const { c, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
      <View style={{ width: 20, alignItems: 'center', paddingTop: 2 }}>
        <Ionicons name={icon} size={16} color={c.textMuted} />
      </View>
      <AppText variant="meta" muted style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
