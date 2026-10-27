import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { usePressScale } from '@/ui/motion/hooks';
import { exportAllData, exportToMarkdown, importAllData } from '@/features/backup/service';
import { Screen, ScreenIntro } from '@/ui/components/Screen';
import { space, radius } from '@/ui/tokens';

const HAIRLINE = 1;

export default function DataScreen() {
  const { c, space: sp } = useTheme();
  const { handlers: pressHandlers } = usePressScale();
  const [exportText, setExportText] = useState('');
  const [markdownText, setMarkdownText] = useState('');
  const [importText, setImportText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    try {
      const data = exportAllData();
      const json = JSON.stringify(data, null, 2);
      const md = exportToMarkdown(data);
      setExportText(json);
      setMarkdownText(md);
      setStatus({ type: 'success', message: 'Yedek olu\u015fturuldu.' });
      haptic('success');
    } catch (error) {
      setStatus({ type: 'error', message: (error as Error).message });
      haptic('light');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (!importText.trim()) {
      setStatus({ type: 'error', message: 'L\u00fctfen ge\u00e7erli bir JSON yap\u0131\u015ft\u0131r\u0131n.' });
      haptic('light');
      return;
    }
    setIsImporting(true);
    try {
      const data = JSON.parse(importText);
      importAllData(data);
      setStatus({ type: 'success', message: 'Veri ba\u015far\u0131yla i\u00e7eri aktar\u0131ld\u0131.' });
      haptic('success');
    } catch (error) {
      setStatus({ type: 'error', message: (error as Error).message });
      haptic('light');
    } finally {
      setIsImporting(false);
    }
  }, [importText]);

  const sectionStyle: ViewStyle = {
    marginHorizontal: space.lg,
    marginBottom: space.lg,
  };

  const sectionTitleStyle: TextStyle = {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
    marginBottom: space.xs,
  };

  const sectionHintStyle: TextStyle = {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: sp.sm,
  };

  const actionButtonStyle: ViewStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    paddingVertical: space.md,
    borderRadius: radius.md,
    minHeight: 48,
  };

  const actionTextStyle: TextStyle = {
    color: c.bg,
    fontWeight: '600',
    fontSize: 15,
  };

  const codeBlockStyle: TextStyle = {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: space.md,
    fontFamily: 'monospace',
    fontSize: 11,
    color: c.text,
    borderWidth: HAIRLINE,
    borderColor: c.border,
  };

  const importInputStyle: TextStyle = {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: HAIRLINE,
    borderRadius: radius.md,
    padding: space.md,
    color: c.text,
    fontSize: 13,
    minHeight: 120,
    textAlignVertical: 'top' as const,
  };

  const statusBannerStyle: ViewStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: sp.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: HAIRLINE,
  };

  return (
    <Screen>
      <ScreenIntro
        title="Veri Yedekleme"
        subtitle="Tüm verinizi JSON veya Markdown olarak dışarı aktarın, geri yükleyin."
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: sp.lg,
          paddingBottom: sp.xxl,
          gap: sp.md,
        }}
      >
        {status && (
          <View
            style={[
              statusBannerStyle,
              {
                backgroundColor: status.type === 'success' ? c.focusSoft : c.accentSoft,
                borderColor: status.type === 'success' ? c.focus : c.accent,
              },
            ]}
            accessibilityRole="alert"
          >
            <Text style={{ color: status.type === 'success' ? c.focus : c.accent, fontSize: 13, fontWeight: '500' }}>
              {status.message}
            </Text>
          </View>
        )}

        <View style={sectionStyle}>
          <Text style={sectionTitleStyle}>JSON Yedeği</Text>
          <Text style={sectionHintStyle}>Tüm veritabanı, ham JSON formatında.</Text>
          <Pressable
            {...pressHandlers}
            style={[actionButtonStyle, { backgroundColor: c.accent }]}
            onPress={handleExport}
            disabled={isExporting}
            accessible
            accessibilityLabel="JSON yedeği oluştur"
          >
            <Ionicons
              name={isExporting ? 'reload-circle' : 'download-outline'}
              size={18}
              color={c.bg}
            />
            <Text style={actionTextStyle}>
              {isExporting ? 'Olu\u015fturuluyor...' : 'JSON Olu\u015ftur'}
            </Text>
          </Pressable>

          {Boolean(exportText) && (
            <View style={{ marginTop: space.sm }}>
              <TextInput
                value={exportText}
                editable={false}
                multiline
                numberOfLines={8}
                style={codeBlockStyle}
              />
            </View>
          )}
        </View>

        <View style={sectionStyle}>
          <Text style={sectionTitleStyle}>Markdown Özeti</Text>
          <Text style={sectionHintStyle}>İnsan okunabilir .md formatında yedek.</Text>
          <Pressable
            {...pressHandlers}
            style={[actionButtonStyle, { backgroundColor: c.surfaceRaised, borderWidth: HAIRLINE, borderColor: c.border }]}
            onPress={handleExport}
            disabled={isExporting}
            accessible
            accessibilityLabel="Markdown yedeği oluştur"
          >
            <Ionicons name={isExporting ? 'reload-circle' : 'document-text-outline'} size={18} color={c.text} />
            <Text style={actionTextStyle}>Markdown Oluştur</Text>
          </Pressable>

          {Boolean(markdownText) && (
            <View style={{ marginTop: space.sm }}>
              <TextInput
                value={markdownText}
                editable={false}
                multiline
                numberOfLines={8}
                style={codeBlockStyle}
              />
            </View>
          )}
        </View>

        <View style={sectionStyle}>
          <Text style={sectionTitleStyle}>Veri İçe Aktar</Text>
          <Text style={sectionHintStyle}>JSON yedeğini buraya yapıştırın ve geri yükleyin.</Text>
          <TextInput
            value={importText}
            onChangeText={setImportText}
            placeholder="JSON içeriğini buraya yapıştırın..."
            multiline
            numberOfLines={6}
            style={importInputStyle}
          />
          <Pressable
            {...pressHandlers}
            style={[actionButtonStyle, { backgroundColor: c.focus }]}
            onPress={handleImport}
            disabled={isImporting || !importText.trim()}
            accessible
            accessibilityLabel="Veriyi içeri aktar"
          >
            <Ionicons
              name={isImporting ? 'reload-circle' : 'cloud-upload-outline'}
              size={18}
              color={c.bg}
            />
            <Text style={actionTextStyle}>
              {isImporting ? 'Yükleniyor...' : 'İçe Aktar'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}