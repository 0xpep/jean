# Terminal Mobile Hotkeys Design

**Goal:** Add a compact, horizontally scrollable hotkey row below terminal views on mobile web so users can send missing terminal control keys to the focused pane.

**Approach:** Keep terminal I/O on the existing xterm → Tauri PTY path. Add a small mobile-only control bar below the terminal, rendered inside the same terminal surface area, that targets the currently focused terminal pane. Each button sends a literal control sequence to the backend, then restores focus to the terminal so typing can continue immediately.

**Scope:** Mobile webview only. Desktop behavior stays unchanged. The control row is for focused pane only, not active tab or broadcast.

---

## User Problem

Mobile keyboards often lack keys needed for terminal work:

- Arrow keys
- Escape
- Ctrl+C
- Ctrl+R

That makes common terminal tasks awkward, especially in editors like `vim` and during shell history navigation.

---

## UX

A single row appears below the terminal.

- Horizontally scrollable
- Small, compact buttons
- Must not wrap into multiple rows
- Easy to tap on mobile
- After tap, terminal keeps focus

Suggested controls:

- Esc
- ↑
- ↓
- ←
- →
- Ctrl+C
- Ctrl+R

---

## Interaction Rules

- Buttons send raw key sequences to the focused terminal pane.
- Terminal focus is restored after send.
- No new terminal state model.
- No backend command changes.
- No special handling for non-terminal components.

---

## Data Flow

1. User taps a hotkey button.
2. UI resolves the focused terminal instance for that pane.
3. UI sends the matching byte sequence through `terminal_write`.
4. PTY receives input as if typed on a real keyboard.
5. UI refocuses terminal.

---

## Key Mapping

| Button | Sequence |
|---|---|
| Esc | `\u001b` |
| Up | `\u001b[A` |
| Down | `\u001b[B` |
| Left | `\u001b[D` |
| Right | `\u001b[C` |
| Ctrl+C | `\u0003` |
| Ctrl+R | `\u0012` |

These are standard terminal control sequences, so backend and shells should already understand them.

---

## Component Boundaries

### `src/components/chat/TerminalHotkeyBar.tsx`

Responsible for:

- rendering the row of buttons
- horizontal scrolling layout
- sending control sequences
- restoring focus after click

### `src/components/chat/TerminalView.tsx`

Responsible for:

- placing the bar below the terminal output area
- keeping terminal layout intact
- wiring the bar to the focused pane terminal ID

### Existing terminal plumbing

Reuse existing terminal hooks and PTY wiring:

- `src/lib/terminal-instances.ts`
- `src/hooks/useTerminal.ts`
- `src-tauri/src/terminal/commands.rs`
- `src-tauri/src/terminal/pty.rs`

No backend changes required for this feature.

---

## Mobile Behavior

This feature should only render in mobile webview contexts where the extra controls are needed.

Desktop terminal UI should remain unchanged.

---

## Testing

Add tests for:

- correct sequence mapping per button
- button click calls send path with expected bytes
- focus restore after send
- row stays single-line and scrollable

Manual verification:

- open `vim` and tap Esc → leaves insert mode
- run a command, then tap ↑ → shell history appears
- run long command, then tap Ctrl+C → interrupt reaches PTY
- tap Ctrl+R → shell reverse search triggers

---

## Non-Goals

- custom terminal keybinding editor
- extra modifier combinations
- desktop toolbar redesign
- backend protocol changes
- sending keys to non-focused panes

---

## Open Questions

- Should the bar show on mobile only in terminal-open states, or always when a terminal exists?
- Should key labels use symbols (`↑`, `Esc`) or text plus hints (`Esc`, `Ctrl+C`)?
