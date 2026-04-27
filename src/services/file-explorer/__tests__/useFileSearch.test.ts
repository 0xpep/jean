import { renderHook, waitFor } from '@testing-library/react'
import { useFileSearch } from '../file-explorer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useFileSearch', () => {
  it('returns empty results for empty search query', async () => {
    const { result } = renderHook(() => useFileSearch('worktreeId', ''), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })

  it('returns empty results for search query shorter than 2 characters', async () => {
    const { result } = renderHook(() => useFileSearch('worktreeId', 'a'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })

  it('returns search results for search query with 2 or more characters', async () => {
    const { result } = renderHook(() => useFileSearch('worktreeId', 'ab'), { wrapper })
    await waitFor(() => {
      expect(result.current.data).toEqual([
        { name: 'file1.md', relative_path: 'dir/file1.md' }
      ])
    })
  })

  it('shows "No files found" message when no matches exist', async () => {
    const { result } = renderHook(() => useFileSearch('worktreeId', 'nonexistent'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })
})
