import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { isNativeApp } from '@/lib/environment'
import type { FileSearchResult, FileTreeResponse } from '@/types/file-explorer'

export function useFileTree(worktreeId: string | undefined, relativePath?: string, respectGitignore = true) {
  return useQuery({
    queryKey: ['file-tree', worktreeId, relativePath, respectGitignore],
    queryFn: async () => {
      if (!isNativeApp()) {
        throw new Error('File tree not available in web view')
      }
      return invoke<FileTreeResponse>('list_worktree_file_tree', {
        worktreeId,
        relativePath,
        respectGitignore,
      })
    },
    enabled: !!worktreeId && isNativeApp(),
  })
}

export function useFileSearch(worktreeId: string | undefined, query: string) {
  return useQuery({
    queryKey: ['file-search', worktreeId, query],
    queryFn: async () => {
      if (!isNativeApp()) {
        throw new Error('File search not available in web view')
      }
      return invoke<FileSearchResult[]>('search_worktree_files', {
        worktreeId,
        query,
      })
    },
    enabled: !!worktreeId && query.length >= 2 && isNativeApp(),
  })
}

export function useReadMarkdown(worktreeId: string | undefined, relativePath: string | null) {
  return useQuery({
    queryKey: ['read-markdown', worktreeId, relativePath],
    queryFn: async () => {
      if (!isNativeApp()) {
        throw new Error('Markdown read not available in web view')
      }
      return invoke<string>('read_worktree_markdown', {
        worktreeId,
        relativePath,
      })
    },
    enabled: !!worktreeId && !!relativePath && isNativeApp(),
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
