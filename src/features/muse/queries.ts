import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMessage,
  createThread,
  deleteMessage,
  deleteThread,
  getThread,
  listMessages,
  listThreads,
  updateThread,
  type CreateMessageInput,
  type CreateThreadInput,
} from './service';
import { chatWithMuse, getAiConfig } from './ai';
import type { ChatMessage, ChatThread } from '@/db/schema';

export const museKeys = {
  all: ['muse'] as const,
  threads: ['muse', 'threads'] as const,
  thread: (id: string) => ['muse', 'thread', id] as const,
  messages: (threadId: string) => ['muse', 'messages', threadId] as const,
  aiConfig: ['muse', 'ai-config'] as const,
};

/** Model bağlantısı ayarı; kaydedince bu sorgu geçersiz kılınır. */
export function useAiConfig() {
  return useQuery({
    queryKey: museKeys.aiConfig,
    queryFn: () => getAiConfig(),
  });
}

export function useThreads() {
  return useQuery({
    queryKey: museKeys.threads,
    queryFn: listThreads,
  });
}

export function useThread(id: string | undefined) {
  return useQuery({
    queryKey: museKeys.thread(id ?? ''),
    queryFn: () => (id ? getThread(id) : null),
    enabled: Boolean(id),
  });
}

export function useMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: museKeys.messages(threadId ?? ''),
    queryFn: () => (threadId ? listMessages(threadId) : []),
    enabled: Boolean(threadId),
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateThreadInput) =>
      Promise.resolve(createThread(input)),
    onSuccess: (thread: ChatThread) => {
      queryClient.setQueryData(museKeys.thread(thread.id), thread);
      void queryClient.invalidateQueries({ queryKey: museKeys.threads });
    },
  });
}

export function useUpdateThread(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { title?: string }) =>
      Promise.resolve(updateThread(id, patch)),
    onSuccess: (thread: ChatThread) => {
      queryClient.setQueryData(museKeys.thread(id), thread);
      void queryClient.invalidateQueries({ queryKey: museKeys.threads });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      deleteThread(id);
      return Promise.resolve(id);
    },
    onSuccess: (id: string) => {
      queryClient.removeQueries({ queryKey: museKeys.thread(id) });
      void queryClient.invalidateQueries({ queryKey: museKeys.threads });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMessageInput) => {
      // Kullanıcı mesajı önce kaydedilir: model yanıtı beklerken de görünür.
      const userMsg = createMessage(input);

      try {
        // Geçmiş veritabanından okunur; ekran kapansa bile bağlam aynı kalır.
        const history = listMessages(input.threadId)
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          }));

        const reply = await chatWithMuse(history);
        const aiMsg = createMessage({
          threadId: input.threadId,
          role: 'assistant',
          content: reply.content,
          model: reply.model,
          tokensIn: reply.tokensIn,
          tokensOut: reply.tokensOut,
        });

        return { userMsg, aiMsg };
      } catch (error) {
        // Başarısız istek geçmişte yarım kalmaz; metin giriş alanına döner.
        deleteMessage(userMsg.id);
        throw error;
      }
    },
    onSuccess: (data, vars) => {
      queryClient.setQueryData<ChatMessage[]>(
        museKeys.messages(vars.threadId),
        (old) => (old ? [...old, data.userMsg, data.aiMsg] : [data.userMsg, data.aiMsg]),
      );
      void queryClient.invalidateQueries({ queryKey: museKeys.threads });
    },
  });
}

