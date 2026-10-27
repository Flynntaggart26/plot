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
import { useTheme } from '@/ui/theme';
import { haptic } from '@/lib/haptics';
import { useThreads, useCreateThread, useSendMessage, useMessages } from '@/features/muse/queries';
import { space, radius } from '@/ui/tokens';

const HAIRLINE = 1;

export default function MuseScreen() {
  const { c, space: sp } = useTheme();
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);


  const { data: threads, isLoading: threadsLoading } = useThreads();
  const createThread = useCreateThread();
  const activeThreadId = threadId ?? threads?.[0]?.id;
  const { data: messages, isLoading: messagesLoading } = useMessages(activeThreadId);
  const sendMessage = useSendMessage();
  const busy = sending || sendMessage.isPending;

  const currentThread = threads?.find((t) => t.id === activeThreadId) ?? threads?.[0];

  const handleSend = useCallback(() => {
    const text = msgInput.trim();
    if (!text || sending) return;
    setSending(true);

    const deliver = (tid: string) => {
      sendMessage.mutate(
        { threadId: tid, role: 'user', content: text },
        {
          onSuccess: () => {
            setMsgInput('');
            setSending(false);
          },
          onError: () => setSending(false),
        },
      );
    };

    if (!activeThreadId) {
      createThread.mutate(
        { title: text.slice(0, 40) },
        {
          onSuccess: (thread: { id: string }) => {
            setThreadId(thread.id);
            deliver(thread.id);
          },
          onError: () => setSending(false),
        },
      );
      return;
    }

    deliver(activeThreadId);
  }, [msgInput, activeThreadId, sending, createThread, sendMessage]);

  if (threadsLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <Text style={{ color: c.textMuted }}>Sohbetler y\u00fckleniyor...</Text>
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
        <Ionicons name="chatbubble-ellipses-outline" size={28} color={c.accent} />
        <View style={headerContentStyle}>
          <Text style={headerTitleStyle}>Muse</Text>
          <Text style={headerSubtitleStyle}>
            {currentThread?.title || 'Yeni sohbet ba\u015flat\u0131n'}
          </Text>
        </View>
        <Pressable
          onPress={createNewThread}
          accessible
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
                <Text style={[bubbleTextStyle, { color: c.text }]}>
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
            <Text style={{ color: c.textMuted, fontSize: 13 }}>Y\u00fckleniyor...</Text>
          </View>
        )}
      </ScrollView>

      <View style={inputContainerStyle}>
        <TextInput
          value={msgInput}
          onChangeText={setMsgInput}
          placeholder={activeThreadId ? 'Mesaj yaz\u0131n...' : '\u0130lk mesaj\u0131n\u0131z\u0131 yaz\u0131n ve sohbeti ba\u015flat\u0131n...'}
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
          accessibilityLabel="G\u00f6nder"
          style={[
            sendButtonStyle,
            { backgroundColor: (busy || !msgInput.trim()) ? c.border : c.accent },
          ]}
        >
          <Ionicons
            name={busy ? 'reload-circle' : 'send-outline'}
            size={20}
            color={c.bg}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}