# Debug Session — File Tree Not Available in Web View

## Error
`Error loading file tree: Cannot read properties of undefined (reading 'invoke')`

## Root Cause
`src/services/file-explorer.ts:2` had a **direct static import**:
```ts
import { invoke } from '@tauri-apps/api/core'
```
In browser mode, `@tauri-apps/api/core` checks for `__TAURI_INTERNALS__` on load. Since the browser doesn't have this global, the module throws or returns undefined, making `invoke` undefined. When `FileExplorerPanel` mounts and calls `useFileTree()`, the `invoke` call crashes.

## Fix
Changed the import to use the project's transport layer:
```ts
import { invoke } from '@/lib/transport'
```
`@/lib/transport` is a **dynamic import** — it lazy-loads `@tauri-apps/api/core` only when `isNativeApp()` is true. In browser mode it falls back to WebSocket transport (`WsTransport`), so `invoke` is always defined.

## Key Files
- `src/services/file-explorer.ts` — changed (import swap)
- `src/lib/transport.ts` — transport abstraction; use `isNativeApp()` to gate Tauri imports
- `src/lib/environment.ts` — `isNativeApp()` checks for `__TAURI_INTERNALS__` in window
- `src/components/projects/FileExplorerPanel.tsx` — uses `useFileTree()` / `useFileSearch()`
- `src-tauri/src/http_server/dispatch.rs` — backend endpoint `list_worktree_file_tree`

## Pattern
Always use `@/lib/transport` for Tauri commands in shared/browser code. Never directly import `@tauri-apps/api/core` in modules loaded by the web view.
