import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TerminalHotkeyBar, HOTKEYS } from './TerminalHotkeyBar'

const invokeMock = vi.fn()
const focusTerminalMock = vi.fn()

vi.mock('@/lib/transport', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

vi.mock('@/lib/terminal-instances', () => ({
  focusTerminal: (...args: unknown[]) => focusTerminalMock(...args),
}))

describe('TerminalHotkeyBar', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    focusTerminalMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
  })

  it('renders expected hotkeys', () => {
    render(<TerminalHotkeyBar terminalId="term-1" />)
    for (const hotkey of HOTKEYS) {
      expect(
        screen.getByRole('button', { name: hotkey.label })
      ).toBeInTheDocument()
    }
  })

  it('sends mapped sequence and restores focus', async () => {
    render(<TerminalHotkeyBar terminalId="term-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Ctrl+C' }))

    await vi.waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('terminal_write', {
        terminalId: 'term-1',
        data: '\u0003',
      })
      expect(focusTerminalMock).toHaveBeenCalledWith('term-1')
    })
  })

  it('keeps row single line and scrollable', () => {
    const { container } = render(<TerminalHotkeyBar terminalId="term-1" />)
    const row = container.querySelector('.overflow-x-auto.whitespace-nowrap')
    expect(row).toBeInTheDocument()
  })
})
