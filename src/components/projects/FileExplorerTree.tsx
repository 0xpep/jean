import { useState } from 'react'
import { FileTreeNode } from '@/types/file-explorer'
import { ChevronRight, ChevronDown, File, Folder, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileExplorerTreeProps {
  nodes: FileTreeNode[]
  onFileClick: (path: string) => void
}

export function FileExplorerTree({ nodes, onFileClick }: FileExplorerTreeProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())

  const toggleCollapse = (path: string) => {
    const next = new Set(collapsedPaths)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    setCollapsedPaths(next)
  }

  const isVisible = (node: FileTreeNode) => {
    const parts = node.relative_path.split('/')
    if (parts.length === 1) return true
    
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/')
      if (collapsedPaths.has(parentPath)) {
        return false
      }
    }
    return true
  }

  const visibleNodes = nodes.filter(isVisible)

  return (
    <div className="flex flex-col py-2 font-mono text-xs">
      {visibleNodes.map(node => (
        <div
          key={node.relative_path}
          className={cn(
            'flex items-center py-1 px-2 hover:bg-accent cursor-pointer rounded-sm group transition-colors',
            node.node_type === 'directory' ? 'font-medium' : 'text-muted-foreground'
          )}
          style={{ paddingLeft: `${(node.depth - 1) * 12 + 8}px` }}
          onClick={() => {
            if (node.node_type === 'directory') {
              toggleCollapse(node.relative_path)
            } else {
              onFileClick(node.relative_path)
            }
          }}
        >
          <div className="w-4 h-4 flex items-center justify-center mr-1.5 shrink-0">
            {node.node_type === 'directory' ? (
              collapsedPaths.has(node.relative_path) ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )
            ) : null}
          </div>
          <div className="w-4 h-4 flex items-center justify-center mr-1.5 shrink-0">
            {node.node_type === 'directory' ? (
              <Folder className="w-3.5 h-3.5 text-blue-400" />
            ) : node.extension === 'md' || node.extension === 'markdown' ? (
              <FileText className="w-3.5 h-3.5 text-orange-400" />
            ) : (
              <File className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="truncate">{node.name}</span>
        </div>
      ))}
    </div>
  )
}
