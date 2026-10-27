import React, { useRef, useState } from 'react';
import { usePressScale } from '@/ui/motion/hooks';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';


export type NoteEditorProps = {
  noteId?: string;
  initialTitle: string;
  initialBody: string;
  onSave: (values: { title: string; bodyMd: string }) => void;
  busy?: boolean;
  error?: string | null;
};

export function NoteEditor({
  noteId,
  initialTitle,
  initialBody,
  onSave,
  busy = false,
  error = null,
}: NoteEditorProps) {
  const { c, space: sp, radius: rad } = useTheme();
  const { handlers } = usePressScale();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
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

  const saveButtonStyle: ViewStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    paddingVertical: sp.md,
    borderRadius: rad.pill,
    minHeight: 56,
    backgroundColor: c.accent,
  };

  const saveButtonTextStyle: TextStyle = {
    color: c.bg,
    fontWeight: '600',
    fontSize: 16,
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
            style={[inputStyle, inputContainerStyle]}
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
            multiline
            numberOfLines={12}
            style={[editorStyle, editorContainerStyle]}
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

        <View style={{ gap: sp.sm }}>
          <Pressable
            {...handlers}
            style={[saveButtonStyle]}
            onPress={handleSave}
            disabled={busy || !title.trim()}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Notu kaydet"
          >
            <Ionicons
              name={busy ? 'reload-circle' : 'checkmark-outline'}
              size={20}
              color={c.bg}
            />
            <Text style={saveButtonTextStyle}>
              {busy ? 'Kaydediliyor...' : 'Kaydet'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}