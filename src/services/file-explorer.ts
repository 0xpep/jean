import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { FileSearchResult, FileTreeResponse } from '@/types/file-explorer'

export function useFileTree(worktreeId: string | undefined, relativePath?: string) {
  return useQuery({
    queryKey: ['file-tree', worktreeId, relativePath],
    queryFn: () =>
      invoke<FileTreeResponse>('list_worktree_file_tree', {
        worktreeId,
        relativePath,
      }),
    enabled: !!worktreeId,
  })
}

export function useFileSearch(worktreeId: string | undefined, query: string) {
  return useQuery({
    queryKey: ['file-search', worktreeId, query],
    queryFn: () =>
      invoke<FileSearchResult[]>('search_worktree_files', {
        worktreeId,
        query,
      }),
    enabled: !!worktreeId && query.length >= 2,
  })
}

export function useReadMarkdown(worktreeId: string | undefined, relativePath: string | null) {
  return useQuery({
    queryKey: ['read-markdown', worktreeId, relativePath],
    queryFn: () =>
      invoke<string>('read_worktree_markdown', {
        worktreeId,
        relativePath,
      }),
    enabled: !!worktreeId && !!relativePath,
  })
}

export function useWriteMarkdown() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (args: {
      worktreeId: string
      relativePath: string
      content: string
    }) => {
      void args
      return invoke('write_worktree_markdown', args)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['read-markdown', variables.worktreeId, variables.relativePath],
      })
    },
  })
}
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { FileTreeResponse, FileSearchResult } from '@/types/file-explorer'

export function useFileTree(worktreeId: string | undefined, relativePath?: string, respectGitignore = true) {
  return useQuery({
    queryKey: ['file-tree', worktreeId, relativePath, respectGitignore],
    queryFn: () =>
      invoke<FileTreeResponse>('list_worktree_file_tree', {
        worktreeId,
        relativePath,
        respectGitignore,
      }),
    enabled: !!worktreeId,
  })
}

export function useFileSearch(worktreeId: string | undefined, query: string) {
  return useQuery({
    queryKey: ['file-search', worktreeId, query],
    queryFn: () =>
      invoke<FileSearchResult[]>('search_worktree_files', {
        worktreeId,
        query,
      }),
    enabled: !!worktreeId && query.length >= 2,
  })
}

export function useReadMarkdown(worktreeId: string | undefined, relativePath: string | null) {
  return useQuery({
    queryKey: ['read-markdown', worktreeId, relativePath],
    queryFn: () =>
      invoke<string>('read_worktree_markdown', {
        worktreeId,
        relativePath,
      }),
    enabled: !!worktreeId && !!relativePath,
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useWriteMarkdown() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (args: {
      worktreeId: string
      relativePath: string
      content: string
    }) => {
      void args
      return invoke('write_worktree_markdown', args)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['read-markdown', variables.worktreeId, variables.relativePath],
      })
    },
  })
}
