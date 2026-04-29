import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CodeEditor } from '@/components/ui/code-editor'
import { useReadMarkdown, useWriteMarkdown } from '@/services/file-explorer'
import { toast } from 'sonner'
import { Loader2, Copy, Check } from 'lucide-react'

interface EditMarkdownModalProps {
  worktreeId: string
  relativePath: string
  isOpen: boolean
  onClose: () => void
}

export function EditMarkdownModal({
  worktreeId,
  relativePath,
  isOpen,
  onClose,
}: EditMarkdownModalProps) {
  const { data: content, isLoading } = useReadMarkdown(worktreeId, relativePath)
  const [editContent, setEditContent] = useState('')
  const [copied, setCopied] = useState(false)
  const writeMarkdown = useWriteMarkdown()

  useEffect(() => {
    if (content !== undefined) {
      setEditContent(content)
    }
  }, [content])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(relativePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    try {
      await writeMarkdown.mutateAsync({
        worktreeId,
        relativePath,
        content: editContent,
      })
      toast.success('File saved successfully')
      onClose()
    } catch (error) {
      toast.error(`Failed to save file: ${error}`)
    }
  }

  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase()
    const langMap: Record<string, string> = {
      md: 'markdown',
      markdown: 'markdown',
      txt: 'text',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      py: 'python',
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      go: 'go',
      rs: 'rust',
    }
    return langMap[ext || ''] || 'text'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-2 border-b flex flex-row items-center justify-between">
          <DialogTitle className="truncate text-sm font-medium">
            Edit {relativePath}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CodeEditor
              value={editContent}
              language={getLanguage(relativePath)}
              onChange={setEditContent}
              className="h-full text-xs"
            />
          )}
        </div>

        <DialogFooter className="px-4 py-2 border-t bg-muted/50">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={writeMarkdown.isPending}
          >
            {writeMarkdown.isPending && (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
