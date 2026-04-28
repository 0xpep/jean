# Debug: File tree not available in web view — invoke is undefined

## What
`Error loading file tree: Cannot read properties of undefined (reading 'invoke')`

## When
Web view rendering `FileExplorerPanel` component with `worktreeId` prop.

## Why (Root Cause)
`src/services/file-explorer.ts:2` had a direct static import:
```ts
import { invoke } from '@tauri-apps/api/core'
```
In browser mode, `@tauri-apps/api/core` checks for `__TAURI_INTERNALS__` on module load. The browser has no such global, so the import resolves to `undefined`. When `FileExplorerPanel` mounts and calls `useFileTree()`, the lazy `invoke` call crashes with "Cannot read properties of undefined".

## Fix
Replaced the static import with the project transport layer:
```ts
import { invoke } from '@/lib/transport'
```
`@/lib/transport` dynamically imports `@tauri-apps/api/core` only when `isNativeApp()` is true. In browser mode it falls back to `WsTransport`, so `invoke` is always defined.

## Outcomes
- `npx tsc --noEmit` passes with zero errors on changed file (pre-existing errors in `useFileSearch.test.ts` unrelated).
- `npx vite build` succeeds — full production build compiles cleanly.

## Related
file-explorer.ts, transport.ts, FileExplorerPanel.tsx, isNativeApp, __TAURI_INTERNALS__, list_worktree_file_tree, WebSocket transport, Tauri IPC
