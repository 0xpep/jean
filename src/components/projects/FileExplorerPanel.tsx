import { useState } from 'react'
import { Search, X, FolderTree, ListFilter, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFileTree, useFileSearch } from '@/services/file-explorer'
import { FileExplorerTree } from './FileExplorerTree'
import { EditMarkdownModal } from './EditMarkdownModal'
import { cn } from '@/lib/utils'

interface FileExplorerPanelProps {
  worktreeId: string
  className?: string
}

export function FileExplorerPanel({
  worktreeId,
  className,
}: FileExplorerPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [editingFile, setEditingFile] = useState<string | null>(null)

  const {
    data: treeData,
    isLoading: isTreeLoading,
    error: treeError,
  } = useFileTree(worktreeId)
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    error: searchError,
  } = useFileSearch(worktreeId, searchQuery)

  const handleFileClick = (path: string) => {
    const editableExtensions = [
      'md',
      'markdown',
      'txt',
      'json',
      'yaml',
      'yml',
      'py',
      'ts',
      'tsx',
      'js',
      'jsx',
      'go',
      'rs',
    ]
    const ext = path.split('.').pop()?.toLowerCase()
    if (ext && editableExtensions.includes(ext)) {
      setEditingFile(path)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border rounded-lg overflow-hidden',
        className
      )}
    >
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Files
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setIsSearching(!isSearching)
                if (isSearching) setSearchQuery('')
              }}
            >
              {isSearching ? (
                <X className="w-4 h-4" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {isSearching && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isTreeLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : treeError ? (
          <div className="p-8 text-red-500">
            Error loading file tree: {treeError.message}
          </div>
        ) : isSearching ? (
          isSearchLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchError ? (
            <div className="p-8 text-red-500">
              Error searching files: {searchError.message}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="flex flex-col py-2 font-mono text-xs">
              {searchResults?.length ? (
                searchResults.map(result => (
                  <div
                    key={result.relative_path}
                    className="flex items-center py-1.5 px-3 hover:bg-accent cursor-pointer group"
                    onClick={() => handleFileClick(result.relative_path)}
                  >
                    <ListFilter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <div className="flex flex-col truncate">
                      <span className="truncate">{result.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate opacity-70">
                        {result.relative_path}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground italic">
                  No files found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <FileExplorerTree
              nodes={treeData?.nodes || []}
              onFileClick={handleFileClick}
            />
          )
        ) : (
          <FileExplorerTree
            nodes={treeData?.nodes || []}
            onFileClick={handleFileClick}
          />
        )}
      </ScrollArea>

      {editingFile && (
        <EditMarkdownModal
          worktreeId={worktreeId}
          relativePath={editingFile}
          isOpen={!!editingFile}
          onClose={() => setEditingFile(null)}
        />
      )}
    </div>
  )
}
