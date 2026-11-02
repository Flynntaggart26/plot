import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ui/theme';
import { Button } from '@/ui/components/Button';
import { haptic } from '@/lib/haptics';
import { useThreads, useCreateThread, useSendMessage, useMessages, useAiConfig } from '@/features/muse/queries';
import { AiError } from '@/features/muse/ai';
import { space, radius } from '@/ui/tokens';

const HAIRLINE = 1;

export default function MuseScreen() {
  const { c, space: sp } = useTheme();
  const router = useRouter();
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; needsSettings: boolean } | null>(null);


  const { data: threads, isLoading: threadsLoading } = useThreads();
  const createThread = useCreateThread();
  const activeThreadId = threadId ?? threads?.[0]?.id;
  const { data: messages, isLoading: messagesLoading } = useMessages(activeThreadId);
  const sendMessage = useSendMessage();
  const aiConfig = useAiConfig();
  const busy = sending || sendMessage.isPending;
  const aiReady = Boolean(aiConfig.data?.enabled);

  const currentThread = threads?.find((t) => t.id === activeThreadId) ?? threads?.[0];

  const handleSend = useCallback(async () => {
    const text = msgInput.trim();
    if (!text || busy) return;
    setError(null);
    setSending(true);

    try {
      let targetId = activeThreadId;
      if (!targetId) {
        const thread = await createThread.mutateAsync({ title: text.slice(0, 40) });
        targetId = thread.id;
        setThreadId(thread.id);
      }

      await sendMessage.mutateAsync({ threadId: targetId, role: 'user', content: text });
      setMsgInput('');
    } catch (cause) {
      // Mesaj kaybolmaz: gönderilemeyen metin giriş alanına geri döner.
      setMsgInput((current) => current || text);
      setError({
        message: cause instanceof Error ? cause.message : 'Mesaj gönderilemedi.',
        needsSettings:
          cause instanceof AiError &&
          (cause.kind === 'config' || cause.kind === 'auth' || cause.kind === 'connection'),
      });
    } finally {
      setSending(false);
    }
  }, [msgInput, activeThreadId, busy, createThread, sendMessage]);

  if (threadsLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <Text style={{ color: c.textMuted }}>Sohbetler yükleniyor...</Text>
      </View>
    );
  }

  const createNewThread = () => {
    haptic('medium');
    setThreadId(undefined);
    setMsgInput('');
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: c.surface,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: c.border,
  };

  const headerContentStyle: ViewStyle = {
    flex: 1,
    marginHorizontal: space.sm,
  };

  const headerTitleStyle: TextStyle = {
    fontSize: 18,
    fontWeight: '600',
    color: c.text,
  };

  const headerSubtitleStyle: TextStyle = {
    fontSize: 13,
    color: c.textMuted,
  };

  const dividerStyle: ViewStyle = {
    height: HAIRLINE,
    backgroundColor: c.border,
  };

  const messageRowStyle: ViewStyle = {
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    gap: sp.sm,
    alignSelf: 'flex-start',
  };

  const userRowStyle: ViewStyle = {
    alignSelf: 'flex-end',
  };

  const aiRowStyle: ViewStyle = {
    alignSelf: 'flex-start',
  };

  const bubbleStyle: ViewStyle = {
    paddingHorizontal: space.md,
    paddingVertical: sp.sm,
    borderRadius: radius.card,
    maxWidth: '85%',
  };

  const userBubbleStyle: ViewStyle = {
    backgroundColor: c.accent,
  };

  const aiBubbleStyle: ViewStyle = {
    backgroundColor: c.surfaceRaised,
    borderWidth: HAIRLINE,
    borderColor: c.border,
  };

  const bubbleTextStyle: TextStyle = {
    fontSize: 15,
    lineHeight: 22,
  };

  const metaStyle: TextStyle = {
    fontSize: 11,
    marginTop: 4,
  };

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: c.bg,
    borderTopWidth: HAIRLINE,
    borderTopColor: c.border,
  };

  const textInputStyle: TextStyle = {
    flex: 1,
    color: c.text,
    fontSize: 15,
  };

  const sendButtonStyle: ViewStyle = {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled
    >
      <View style={headerStyle}>
        <Pressable
          onPress={() => {
            haptic('tick');
            router.back();
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Geri"
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: c.surface,
            borderWidth: HAIRLINE,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: space.sm,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </Pressable>
        <Ionicons name="chatbubble-ellipses-outline" size={28} color={c.accent} />
        <View style={headerContentStyle}>
          <Text style={headerTitleStyle}>Muse</Text>
          <Text style={headerSubtitleStyle} numberOfLines={1}>
            {aiReady
              ? `${aiConfig.data?.model ?? 'model'} · ${currentThread?.title ?? 'Yeni sohbet'}`
              : 'Henüz bir modele bağlı değil'}
          </Text>
        </View>
        <Pressable
          onPress={createNewThread}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Yeni sohbet"
        >
          <Ionicons name="create-outline" size={20} color={c.textMuted} />
        </Pressable>
      </View>

      <View style={dividerStyle} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: sp.lg,
          paddingVertical: sp.md,
          gap: sp.md,
          alignSelf: 'center',
          maxWidth: 600,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!aiReady ? (
          <View
            style={{
              alignItems: 'center',
              gap: sp.xs,
              padding: sp.md,
              borderRadius: radius.card,
              backgroundColor: c.surface,
              borderWidth: HAIRLINE,
              borderColor: c.border,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={22} color={c.textMuted} />
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>
              Muse henüz bağlı değil
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 13,
                textAlign: 'center',
                lineHeight: 19,
              }}
            >
              Yerel Ollama ya da OpenAI uyumlu bir model bağla. Sohbet geçmişi cihazda kalır.
            </Text>
            <View style={{ marginTop: sp.xs }}>
              <Button
                label="AI ayarları"
                icon="settings-outline"
                onPress={() => {
                  haptic('tick');
                  router.push('/settings/ai');
                }}
              />
            </View>
          </View>
        ) : null}

        {(messages ?? []).map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <View
              key={msg.id}
              style={[
                messageRowStyle,
                isUser ? userRowStyle : aiRowStyle,
              ]}
            >
              <View
                style={[
                  bubbleStyle,
                  isUser ? userBubbleStyle : aiBubbleStyle,
                ]}
              >
                <Text style={[bubbleTextStyle, { color: isUser ? c.bg : c.text }]}>
                  {msg.content}
                </Text>
              </View>
              <Text style={[metaStyle, { color: c.textFaint }]}>
                {new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        })}

        {messagesLoading && (
          <View style={{ alignSelf: 'center', paddingVertical: sp.md }}>
            <Text style={{ color: c.textMuted, fontSize: 13 }}>Yükleniyor...</Text>
          </View>
        )}

        {aiReady && !messagesLoading && (messages ?? []).length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: sp.xxl,
              gap: sp.xs,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.surfaceRaised,
                borderWidth: HAIRLINE,
                borderColor: c.border,
              }}
            >
              <Ionicons name="sparkles-outline" size={22} color={c.accent} />
            </View>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>
              {activeThreadId ? 'Sohbet boş' : 'Yeni bir sohbet'}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 13,
                textAlign: 'center',
                maxWidth: 320,
                lineHeight: 19,
              }}
            >
              İlk mesajını yaz. Sohbet geçmişi yalnızca bu cihazda saklanır.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {error ? (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingTop: sp.sm,
            backgroundColor: c.bg,
          }}
        >
          <View
            accessibilityRole="alert"
            style={{
              borderWidth: HAIRLINE,
              borderColor: c.danger,
              backgroundColor: c.surface,
              borderRadius: radius.md,
              padding: sp.sm,
              gap: sp.xs,
            }}
          >
            <Text style={{ color: c.danger, fontSize: 13, lineHeight: 18 }}>
              {error.message}
            </Text>
            {error.needsSettings ? (
              <Pressable
                onPress={() => {
                  haptic('tick');
                  router.push('/settings/ai');
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="AI ayarlarını aç"
              >
                <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>
                  AI ayarlarını aç
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {!aiReady ? (
        <View style={[inputContainerStyle, { justifyContent: 'center' }]}>
          <Pressable
            onPress={() => {
              haptic('tick');
              router.push('/settings/ai');
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Muse'yi bir modele bağla"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: sp.xs,
              width: '100%',
              minHeight: 48,
              paddingHorizontal: space.md,
              borderRadius: radius.pill,
              backgroundColor: c.surface,
              borderWidth: HAIRLINE,
              borderColor: c.border,
            }}
          >
            <Ionicons name="settings-outline" size={17} color={c.accent} />
            <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
              Muse&apos;yi bir modele bağla
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={inputContainerStyle}>
          <TextInput
            value={msgInput}
            onChangeText={setMsgInput}
            placeholder="Mesaj yazın..."
            multiline
            style={[
              textInputStyle,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: radius.pill,
                paddingHorizontal: space.md,
                paddingVertical: sp.sm,
              },
            ]}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={busy || !msgInput.trim()}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            style={[
              sendButtonStyle,
              { backgroundColor: busy || !msgInput.trim() ? c.border : c.accent },
            ]}
          >
            <Ionicons
              name={busy ? 'reload-circle' : 'send-outline'}
              size={20}
              color={c.bg}
            />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}