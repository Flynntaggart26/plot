import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIdea,
  deleteIdea,
  getIdea,
  listIdeas,
  updateIdea,
  type CreateIdeaInput,
  type IdeaStatus,
  type UpdateIdeaInput,
} from './service';

export const ideaKeys = {
  all: ['ideas'] as const,
  list: (status?: IdeaStatus | null) => ['ideas', 'list', status ?? 'all'] as const,
  detail: (id: string) => ['ideas', 'detail', id] as const,
};

export function useIdeas(status?: IdeaStatus) {
  return useQuery({
    queryKey: ideaKeys.list(status),
    queryFn: () => listIdeas(status),
  });
}

export function useIdea(id: string | undefined) {
  return useQuery({
    queryKey: ideaKeys.detail(id ?? ''),
    queryFn: () => (id ? getIdea(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIdeaInput) => Promise.resolve(createIdea(input)),
    onSuccess: (idea) => {
      queryClient.setQueryData(ideaKeys.detail(idea.id), idea);
      void queryClient.invalidateQueries({ queryKey: ideaKeys.all });
    },
  });
}

export function useUpdateIdea(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateIdeaInput) => Promise.resolve(updateIdea(id, patch)),
    onSuccess: (idea) => {
      queryClient.setQueryData(ideaKeys.detail(id), idea);
      void queryClient.invalidateQueries({ queryKey: ideaKeys.all });
    },
  });
}

export function useDeleteIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      deleteIdea(id);
      return Promise.resolve(id);
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: ideaKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: ideaKeys.all });
    },
  });
}
