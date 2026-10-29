import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/ui/theme';
import { AppText } from '@/ui/components/Screen';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { extractWikiLinks } from './service';
import { normalizeTitle } from './link-utils';
import { NotePickerSheet } from './NoteLinks';

export type NoteEditorProps = {
  noteId?: string;
  initialTitle: string;
  initialBody: string;
  onSave: (values: { title: string; bodyMd: string }) => void;
  busy?: boolean;
  error?: string | null;
};

/** Şablon önekleri (settings'te key='note_templates' olarak saklanır). */
const DEFAULT_TEMPLATES: { key: string; title: string; body: string }[] = [
  {
    key: 'gunluk',
    title: 'Günlük',
    body: `# ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n\n## Niyet\nBugün ne yapmak istiyorum?\n\n## Akış\n- \n- \n- \n\n## Değerlendirme\nBugünü nasıl değerlendiriyorum?\n`,
  },
  {
    key: 'toplanti',
    title: 'Toplantı',
    body: `# Toplantı Notu\n\n**Konu:** \n**Katılımcılar:** \n**Tarih:** ${new Date().toLocaleDateString('tr-TR')}\n\n## Gündem\n- \n- \n\n## Kararlar\n- \n\n## Aksiyonlar\n- [ ] \n- [ ] \n`,
  },
  {
    key: 'karar',
    title: 'Karar',
    body: `# Karar\n\n**Konu:** \n**Tarih:** ${new Date().toLocaleDateString('tr-TR')}\n\n## Seçenekler\n- \n- \n\n## Karar\n\n## Neden\n\n## Sonraki Adımlar\n- \n`,
  },
];

/**
 * Not editörü. Alanlar odaklandığında çerçeve vurguya döner; kaydetme
 * butonu diğer birincil eylemlerle aynı bileşeni kullanır ki parlama,
 * basış ve yükleme davranışı tek yerden gelsin.
 */
export function NoteEditor({
  noteId,
  initialTitle,
  initialBody,
  onSave,
  busy = false,
  error = null,
}: NoteEditorProps) {
  const { c, space: sp, radius: rad } = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [focused, setFocused] = useState<'title' | 'body' | null>(null);
  const [selection, setSelection] = useState({ start: initialBody.length, end: initialBody.length });
  const [forcedSelection, setForcedSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const textRef = useRef<TextInputInstance | null>(null);

  const applyTemplate = (template: string) => {
    const next = body ? `${body}\n\n---\n\n${template}` : template;
    setBody(next);
    setTemplateOpen(false);
    haptic('light');
    toast('Şablon eklendi');
  };

  const insertLink = (picked: string) => {
    const clean = picked.trim();
    if (!clean) return;

    const already = extractWikiLinks(body).some(
      (existing) => normalizeTitle(existing) === normalizeTitle(clean),
    );
    if (already) {
      toast('Zaten bağlı', 'info');
      setPickerOpen(false);
      return;
    }

    const snippet = `[[${clean}]]`;
    const start = Math.min(selection.start, body.length);
    const end = Math.min(selection.end, body.length);
    const next = `${body.slice(0, start)}${snippet}${body.slice(end)}`;
    const cursor = start + snippet.length;

    setBody(next);
    setSelection({ start: cursor, end: cursor });
    setForcedSelection({ start: cursor, end: cursor });
    setPickerOpen(false);
    haptic('light');
  };

  const handleSave = () => {
    if (!title.trim()) {
      haptic('light');
      return;
    }
    haptic('medium');
    onSave({ title: title.trim(), bodyMd: body });
  };

  const inputStyle: TextStyle = {
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
    color: c.text,
  };

  const editorStyle: TextStyle = {
    fontSize: 15,
    lineHeight: 22,
    padding: sp.md,
    color: c.text,
    textAlignVertical: 'top' as const,
  };

  const inputContainerStyle: ViewStyle = {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rad.md,
    minHeight: 56,
  };

  const editorContainerStyle: ViewStyle = {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rad.md,
    minHeight: 300,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled
    >
      <ScrollView
        contentContainerStyle={{ gap: sp.lg, paddingHorizontal: sp.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: sp.sm }}>
          <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>
            Başlık
          </Text>
          <TextInput
            ref={textRef}
            value={title}
            onChangeText={setTitle}
            placeholder="Not başlığı"
            placeholderTextColor={c.textFaint}
            selectionColor={c.accent}
            onFocus={() => setFocused('title')}
            onBlur={() => setFocused(null)}
            style={[
              inputStyle,
              inputContainerStyle,
              styles.webInput,
              focused === 'title' && { borderColor: c.accent },
            ]}
            autoFocus
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>

        <View style={{ gap: sp.sm }}>
          <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>
            Gövde (Markdown)
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Düşüncelerinizi buraya yazın... [[Başlık]] ile link ekleyebilirsiniz."
            placeholderTextColor={c.textFaint}
            selectionColor={c.accent}
            selection={forcedSelection}
            onSelectionChange={(event) => {
              setSelection(event.nativeEvent.selection);
              setForcedSelection(undefined);
            }}
            onFocus={() => setFocused('body')}
            onBlur={() => setFocused(null)}
            multiline
            numberOfLines={12}
            style={[
              editorStyle,
              editorContainerStyle,
              styles.webInput,
              focused === 'body' && { borderColor: c.accent },
            ]}
          />
        </View>

        <Button
          label="Bağlantı ekle"
          variant="secondary"
          icon="link-outline"
          onPress={() => setPickerOpen(true)}
        />

        <Button
          label="Şablon"
          variant="ghost"
          icon="copy-outline"
          onPress={() => setTemplateOpen(true)}
        />

        {templateOpen ? (
          <View
            style={{
              gap: sp.xs,
              marginTop: sp.xs,
              paddingHorizontal: sp.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.border,
              paddingTop: sp.sm,
            }}
          >
            <AppText variant="meta" muted style={{ letterSpacing: 0.6 }}>
              ŞABLON
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.xs }}>
              {DEFAULT_TEMPLATES.map((tpl) => (
                <Chip
                  key={tpl.key}
                  label={tpl.title}
                  selected={false}
                  onPress={() => applyTemplate(tpl.body)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <NotePickerSheet
          visible={pickerOpen}
          excludeId={noteId}
          onSelect={insertLink}
          onClose={() => setPickerOpen(false)}
        />

        {error ? (
          <View
            style={{
              backgroundColor: c.surface,
              borderColor: c.danger,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: rad.md,
              padding: sp.md,
            }}
            accessibilityRole="alert"
          >
            <Text style={{ color: c.danger, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <Button
          label={busy ? 'Kaydediliyor...' : 'Kaydet'}
          icon={busy ? undefined : 'checkmark-outline'}
          loading={busy}
          disabled={!title.trim()}
          onPress={handleSave}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Tarayıcının siyah odak halkası yerine kendi vurgu çerçevemiz kullanılır.
  webInput: Platform.OS === 'web' ? { outlineStyle: 'none' as unknown as 'solid' } : {},
});
