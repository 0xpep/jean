# Worktree File Explorer Design

**Goal**
Add a frontend file explorer for the active worktree in the project canvas panel, limited to tree navigation, name/path search, copy path, and markdown editing.

## Scope

Included:
- Worktree-scoped explorer only
- Project canvas panel placement
- Tree navigation via expand/collapse
- Search by filename and relative path
- Copy path action
- Markdown edit modal

Excluded:
- Global filesystem browsing
- Sidebar/project-tree replacement
- Breadcrumbs
- Dual-pane layout
- Content search
- Delete actions
- New persistence for filesystem items

## Approach

Recommended approach: thin backend, richer frontend.

Why:
- Backend can expose typed filesystem results.
- Frontend can own transient UI state.
- Fits existing React + Tauri + TanStack Query patterns.
- Avoids over-design for a narrow feature.

## Backend Design

New Tauri commands:

1. `list_worktree_file_tree(worktreeId, relativePath?)`
2. `search_worktree_files(worktreeId, query)`
3. `read_worktree_markdown_file(worktreeId, relativePath)`
4. `write_worktree_markdown_file(worktreeId, relativePath, content)`

### Command behavior

#### `list_worktree_file_tree`
- Resolve worktree path from `worktreeId`.
- Run `eza --tree` rooted at the requested worktree path.
- Parse command output into typed tree nodes.
- Return worktree-local relative paths.
- Support optional subtree loading by `relativePath`.

#### `search_worktree_files`
- Resolve worktree path from `worktreeId`.
- Run `fd <query>` from worktree root.
- Search should match filename and relative path behavior provided by `fd`.
- Return both files and directories when matched.

#### `read_worktree_markdown_file`
- Read only `.md` and `.markdown` files.
- Reject paths outside the worktree root.
- Return raw content for modal editing.

#### `write_worktree_markdown_file`
- Write only `.md` and `.markdown` files.
- Reject paths outside the worktree root.
- Overwrite file content atomically enough for current app conventions.

### Backend safety rules
- Use `silent_command()` for subprocesses.
- Resolve all user-facing paths relative to the worktree root.
- Canonicalize and reject path escape attempts.
- Register every new command in both:
  - `src-tauri/src/lib.rs`
  - `src-tauri/src/http_server/dispatch.rs`

## Data Model

No new DB/storage model for files.

Use live filesystem data only.

Suggested Rust/TypeScript transport shapes:

```ts
type FileTreeNode = {
  relative_path: string
  name: string
  node_type: 'file' | 'directory'
  depth: number
  has_children?: boolean
  extension?: string
}

type FileTreeResponse = {
  root: string
  nodes: FileTreeNode[]
}

type FileSearchResult = {
  relative_path: string
  name: string
  node_type: 'file' | 'directory'
}
```

Optional UI-only state:
- selected row
- expanded folder ids
- search query
- modal open state
- saving/loading flags

If any persistence is needed later, use existing UI-state patterns, not project DB models.

## Frontend Design

Primary location:
- project canvas panel for the selected worktree

Main sections:
- panel header
- search input
- tree/search result list
- row actions
- markdown edit modal

### Tree mode
- Default mode when search is empty.
- Folder click toggles expand/collapse.
- File click selects row.
- Each row shows actions based on file type.

### Search mode
- Triggered when search input is non-empty.
- Replaces tree list with flat search results.
- Clearing search returns to tree mode.

### Actions
- Copy path: copy relative path to clipboard.
- Edit: only shown for markdown files; opens modal.

### Markdown modal
- Opened from row action.
- Loads current markdown content from backend.
- Supports edit, cancel, save.
- Save shows toast success/error feedback.

## Wireframe

```text
+---------------- Project Canvas ---------------+
| Worktree: feature-x                           |
|                                               |
| File Explorer                                 |
| [ Search files...                    ]        |
|                                               |
| > src                                         |
|   > components                                |
|   v docs                                      |
|     README.md        [Copy] [Edit]            |
|     notes.md         [Copy] [Edit]            |
|   package.json       [Copy]                   |
|                                               |
| Search mode                                   |
| docs/README.md       [Copy] [Edit]            |
| src/components/ui.tsx [Copy]                  |
+-----------------------------------------------+

Edit Markdown
+----------------------------------------------+
| README.md                                     |
| -------------------------------------------- |
| [textarea/editor]                             |
|                                              |
|                     [Cancel] [Save]          |
+----------------------------------------------+
```

## Likely File Areas

Backend:
- `src-tauri/src/projects/commands.rs`
- `src-tauri/src/projects/types.rs`
- `src-tauri/src/http_server/dispatch.rs`
- `src-tauri/src/lib.rs`

Frontend:
- `src/components/dashboard/ProjectCanvasView.tsx`
- `src/components/projects/*` for new explorer components
- `src/services/projects.ts` or a new dedicated file-explorer service
- `src/types/projects.ts` or a new dedicated file-explorer type file

Reuse candidates:
- `src/components/chat/FileContentModal.tsx`
- `src/components/chat/TextFilePreview.tsx`
- existing toast/query patterns

## Testing Strategy

Backend:
- path validation tests
- markdown-only read/write tests
- parser tests for tree/search output

Frontend:
- tree render/expand tests
- search mode toggle tests
- copy path action test
- markdown modal open/save tests

## Open Questions

None remaining from current requested scope.
