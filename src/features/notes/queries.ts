import { localDayKey } from '@/lib/date';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createNote,
  createNoteLink,
  deleteNote,
  getBacklinks,
  getDailyNote,
  getNote,
  getNoteLinks,
  listNotes,
  toggleNoteTag,
  updateNote,
  type CreateNoteInput,
  type UpdateNoteInput,
} from './service';

export const noteKeys = {
  all: ['notes'] as const,
  list: (folder?: string | null) => ['notes', 'list', folder ?? 'all'] as const,
  daily: (dayKey: string) => ['notes', 'daily', dayKey] as const,
  detail: (id: string) => ['notes', 'detail', id] as const,
  links: (noteId: string) => ['notes', 'links', noteId] as const,
  backlinks: (noteId: string) => ['notes', 'backlinks', noteId] as const,
};

export function useNotes(folder?: string | null) {
  return useQuery({
    queryKey: noteKeys.list(folder),
    queryFn: () => listNotes(folder),
  });
}

export function useDailyNote(dayKey: string = localDayKey()) {
  return useQuery({
    queryKey: noteKeys.daily(dayKey),
    queryFn: () => getDailyNote(dayKey),
  });
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ''),
    queryFn: () => (id ? getNote(id) : null),
    enabled: Boolean(id),
  });
}

export function useNoteLinks(noteId: string | undefined) {
  return useQuery({
    queryKey: noteKeys.links(noteId ?? ''),
    queryFn: () => (noteId ? getNoteLinks(noteId) : []),
    enabled: Boolean(noteId),
  });
}

/** Bu nota işaret eden notlar. */
export function useBacklinks(noteId: string | undefined) {
  return useQuery({
    queryKey: noteKeys.backlinks(noteId ?? ''),
    queryFn: () => (noteId ? getBacklinks(noteId) : []),
    enabled: Boolean(noteId),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) =>
      Promise.resolve(createNote(input)),
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(note.id), note);
      void queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

export function useUpdateNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateNoteInput) =>
      Promise.resolve(updateNote(id, patch)),
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(id), note);
      void queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      deleteNote(id);
      return Promise.resolve(id);
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

export function useCreateNoteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceId,
      targetTitle,
      resolvedId,
    }: {
      sourceId: string;
      targetTitle: string;
      resolvedId?: string | null;
    }) =>
      Promise.resolve(createNoteLink(sourceId, targetTitle, resolvedId ?? null)),
    onSuccess: (_link, vars) => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.links(vars.sourceId) });
    },
  });
}

export function useToggleNoteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, tagName }: { noteId: string; tagName: string }) =>
      Promise.resolve(toggleNoteTag(noteId, tagName)),
    onSuccess: (_vars, { noteId }) => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
      void queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}