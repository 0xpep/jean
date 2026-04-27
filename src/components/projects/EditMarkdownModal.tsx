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
import { Loader2 } from 'lucide-react'

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
  const writeMarkdown = useWriteMarkdown()

  useEffect(() => {
    if (content !== undefined) {
      setEditContent(content)
    }
  }, [content])

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">Edit {relativePath}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CodeEditor
              value={editContent}
              language="markdown"
              onChange={setEditContent}
              className="h-full"
            />
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={writeMarkdown.isPending}>
            {writeMarkdown.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
