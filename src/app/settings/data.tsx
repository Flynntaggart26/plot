import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { SubHeader } from '@/ui/components/SubHeader';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { localDayKey } from '@/lib/date';
import { copyToClipboard, isTauriRuntime, pickTextFile, saveTextFile } from '@/lib/file-transfer';
import {
  exportAllData,
  exportToMarkdown,
  importAllData,
  parseBackupText,
  type BackupData,
} from '@/features/backup/service';

type Status = { type: 'success' | 'error' | 'info'; message: string };

type PendingImport = {
  name: string;
  data: BackupData;
  tasks: number;
  notes: number;
  ideas: number;
  focusSessions: number;
};

function byteLength(text: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  return text.length;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Veri ve yedekleme ekranı.
 *
 * Yedek artık panoya değil dosyaya gider: masaüstünde yerel kaydetme penceresi,
 * tarayıcıda indirme. İçe aktarma iki adımlıdır çünkü mevcut verinin üzerine
 * yazar; dosya seçmek tek başına geri yükleme sayılmaz.
 */
export default function DataScreen() {
  const { c, space, radius } = useTheme();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<'json' | 'markdown' | 'import' | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [lastFile, setLastFile] = useState<{ name: string; bytes: number } | null>(null);

  const runExport = useCallback(
    async (kind: 'json' | 'markdown') => {
      setBusy(kind);
      setStatus(null);
      try {
        const data = exportAllData();
        const isJson = kind === 'json';
        const contents = isJson ? JSON.stringify(data, null, 2) : exportToMarkdown(data);
        const name = `plot-yedek-${localDayKey()}.${isJson ? 'json' : 'md'}`;

        const result = await saveTextFile({
          defaultName: name,
          contents,
          extension: isJson ? 'json' : 'md',
          description: isJson ? 'Plot JSON yedeği' : 'Plot Markdown yedeği',
          mimeType: isJson ? 'application/json' : 'text/markdown;charset=utf-8',
        });

        if (!result.saved) {
          setStatus({ type: 'info', message: 'Kaydetme iptal edildi; dosya oluşturulmadı.' });
          return;
        }

        const bytes = byteLength(contents);
        setLastFile({ name, bytes });
        setStatus({ type: 'success', message: `Yedek kaydedildi (${formatBytes(bytes)}).` });
        haptic('success');
      } catch (error) {
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Yedek oluşturulamadı.',
        });
        haptic('light');
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const copyJson = useCallback(async () => {
    setBusy('json');
    setStatus(null);
    try {
      const data = exportAllData();
      const ok = await copyToClipboard(JSON.stringify(data, null, 2));
      setStatus({
        type: ok ? 'success' : 'error',
        message: ok ? 'JSON yedeği panoya kopyalandı.' : 'Panoya kopyalama desteklenmiyor.',
      });
      if (ok) haptic('success');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Panoya kopyalanamadı.',
      });
    } finally {
      setBusy(null);
    }
  }, []);

  const pickBackup = useCallback(async () => {
    setBusy('import');
    setStatus(null);
    setPending(null);
    try {
      const file = await pickTextFile({ extensions: ['json'], description: 'Plot JSON yedeği' });
      if (!file) {
        setStatus({ type: 'info', message: 'Dosya seçilmedi.' });
        return;
      }

      const data = parseBackupText(file.contents);
      setPending({
        name: file.name,
        data,
        tasks: data.tasks.length,
        notes: data.notes.length,
        ideas: data.ideas.length,
        focusSessions: data.focusSessions.length,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Yedek okunamadı.',
      });
      haptic('light');
    } finally {
      setBusy(null);
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!pending) return;
    setBusy('import');
    try {
      importAllData(pending.data);
      // Tüm sorguları düşür: ekranlar yeni veriyi kendiliğinden okur.
      queryClient.clear();
      setPending(null);
      setLastFile(null);
      setStatus({
        type: 'success',
        message: `Yedek geri yüklendi: ${pending.tasks} görev, ${pending.notes} not, ${pending.ideas} fikir.`,
      });
      haptic('success');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Yedek geri yüklenemedi.',
      });
      haptic('light');
    } finally {
      setBusy(null);
    }
  }, [pending, queryClient]);

  const card = {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: space.md,
    gap: space.sm,
    overflow: 'hidden' as const,
  };

  const runtimeNote = isTauriRuntime()
    ? 'Masaüstünde kaydetme penceresi açılır; dosyayı istediğin klasöre koyabilirsin.'
    : 'Tarayıcıda dosya indirilir. İçe aktarma için indirdiğin .json dosyasını seç.';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Veri ve Yedekleme" subtitle="Dışa ve içe aktarma" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xxl,
          gap: space.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {status ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: space.xs,
              padding: space.sm,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor:
                status.type === 'success' ? c.focus : status.type === 'error' ? c.danger : c.border,
              backgroundColor:
                status.type === 'success'
                  ? c.focusSoft
                  : status.type === 'error'
                    ? c.accentSoft
                    : c.surface,
            }}
          >
            <Ionicons
              name={
                status.type === 'success'
                  ? 'checkmark-circle-outline'
                  : status.type === 'error'
                    ? 'alert-circle-outline'
                    : 'information-circle-outline'
              }
              size={16}
              color={
                status.type === 'success' ? c.focus : status.type === 'error' ? c.danger : c.textMuted
              }
              style={{ marginTop: 1 }}
            />
            <AppText variant="meta" style={{ flex: 1, color: c.text }}>
              {status.message}
            </AppText>
          </View>
        ) : null}

        <View style={card}>
          <View style={styles.cardHeader}>
            <Ionicons name="download-outline" size={18} color={c.accent} />
            <AppText variant="section">Yedek al</AppText>
          </View>
          <AppText variant="meta" muted>
            JSON tüm veriyi taşır ve geri yüklenebilir. Markdown ise okunabilir bir özet:
            görevler, notlar, fikirler, odak blokları ve günlük planlar.
          </AppText>

          <View style={{ gap: space.xs, marginTop: space.xxs }}>
            <Button
              label="JSON indir"
              icon="download-outline"
              loading={busy === 'json'}
              disabled={busy !== null && busy !== 'json'}
              onPress={() => void runExport('json')}
            />
            <Button
              label="Markdown indir"
              variant="secondary"
              icon="document-text-outline"
              loading={busy === 'markdown'}
              disabled={busy !== null && busy !== 'markdown'}
              onPress={() => void runExport('markdown')}
            />
            {isTauriRuntime() ? (
              <Button
                label="JSON'u panoya kopyala"
                variant="ghost"
                icon="copy-outline"
                disabled={busy !== null}
                onPress={() => void copyJson()}
              />
            ) : null}
          </View>

          {lastFile ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.xs,
                paddingTop: space.xs,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.border,
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color={c.focus} />
              <AppText variant="meta" faint style={{ flex: 1 }} numberOfLines={1}>
                {lastFile.name} · {formatBytes(lastFile.bytes)}
              </AppText>
            </View>
          ) : null}

          <AppText variant="meta" faint style={{ fontSize: 11 }}>
            {runtimeNote}
          </AppText>
        </View>

        <View style={card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-upload-outline" size={18} color={c.accent} />
            <AppText variant="section">Yedeği geri yükle</AppText>
          </View>
          <AppText variant="meta" muted>
            Geri yükleme mevcut veriyi siler ve dosyadaki hâliyle değiştirir. Önce dosyayı seç,
            sonra onayla.
          </AppText>

          {!pending ? (
            <Button
              label={busy === 'import' ? 'Dosya seçiliyor…' : 'JSON dosyası seç'}
              variant="secondary"
              icon="folder-open-outline"
              loading={busy === 'import'}
              onPress={() => void pickBackup()}
            />
          ) : (
            <View
              style={{
                gap: space.sm,
                padding: space.sm,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.danger,
                backgroundColor: c.accentSoft,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="document-text-outline" size={16} color={c.text} />
                <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {pending.name}
                </AppText>
              </View>

              <AppText variant="meta" muted>
                {pending.tasks} görev · {pending.notes} not · {pending.ideas} fikir ·{' '}
                {pending.focusSessions} odak bloğu
              </AppText>

              <AppText variant="meta" style={{ color: c.danger }}>
                Bu işlem geri alınamaz. Devam etmeden önce mevcut verinin yedeğini alman önerilir.
              </AppText>

              <View style={{ flexDirection: 'row', gap: space.xs }}>
                <Button
                  label="Vazgeç"
                  variant="secondary"
                  style={{ flex: 1 }}
                  disabled={busy === 'import'}
                  onPress={() => {
                    setPending(null);
                    setStatus({ type: 'info', message: 'İçe aktarma iptal edildi.' });
                  }}
                />
                <Button
                  label="Geri yükle"
                  variant="danger"
                  icon="warning-outline"
                  style={{ flex: 1 }}
                  loading={busy === 'import'}
                  onPress={() => void confirmImport()}
                />
              </View>
            </View>
          )}
        </View>

        <AppText variant="meta" faint style={{ paddingHorizontal: space.xxs }}>
          Yedekler cihazından ayrılmaz; Plot hiçbir dosyayı sunucuya göndermez.
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
