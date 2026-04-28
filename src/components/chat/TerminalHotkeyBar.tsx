import { useCallback } from 'react'
import { invoke } from '@/lib/transport'
import { focusTerminal } from '@/lib/terminal-instances'

interface TerminalHotkeyBarProps {
  terminalId: string
}

const HOTKEYS = [
  { label: 'Esc', sequence: '\u001b' },
  { label: '↑', sequence: '\u001b[A' },
  { label: '↓', sequence: '\u001b[B' },
  { label: '←', sequence: '\u001b[D' },
  { label: '→', sequence: '\u001b[C' },
  { label: 'Ctrl+C', sequence: '\u0003' },
  { label: 'Ctrl+R', sequence: '\u0012' },
] as const

export function TerminalHotkeyBar({ terminalId }: TerminalHotkeyBarProps) {
  const handlePress = useCallback(
    async (sequence: string) => {
      await invoke('terminal_write', { terminalId, data: sequence })
      focusTerminal(terminalId)
    },
    [terminalId]
  )

  return (
    <div className="border-t border-border px-2 py-1">
      <div className="flex overflow-x-auto whitespace-nowrap">
        {HOTKEYS.map(hotkey => (
          <button
            key={hotkey.label}
            type="button"
            onClick={() => void handlePress(hotkey.sequence)}
            className="mr-1.5 shrink-0 rounded border border-border bg-background px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
          >
            {hotkey.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export { HOTKEYS }
