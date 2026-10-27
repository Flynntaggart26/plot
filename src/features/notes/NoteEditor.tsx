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
import { Button } from '@/ui/components/Button';
import { haptic } from '@/lib/haptics';

export type NoteEditorProps = {
  noteId?: string;
  initialTitle: string;
  initialBody: string;
  onSave: (values: { title: string; bodyMd: string }) => void;
  busy?: boolean;
  error?: string | null;
};

/**
 * Not editörü. Alanlar odaklandığında çerçeve vurguya döner; kaydetme
 * butonu diğer birincil eylemlerle aynı bileşeni kullanır ki parlama,
 * basış ve yükleme davranışı tek yerden gelsin.
 */
export function NoteEditor({
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
  const textRef = useRef<TextInputInstance | null>(null);

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
