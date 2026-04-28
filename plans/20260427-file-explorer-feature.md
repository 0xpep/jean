# Worktree File Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a worktree-scoped file explorer to the project canvas with tree navigation, name/path search, copy path, and markdown editing.

**Architecture:** Add typed Tauri commands under the existing `projects` module for tree/search/markdown edit operations, then consume them from a dedicated frontend service and a focused file-explorer panel mounted inside `ProjectCanvasView`. Keep filesystem data live-only; store only transient UI state in React/local component state.

**Tech Stack:** Rust Tauri commands, `silent_command()`, `eza --tree`, `fd`, React 19, TanStack Query, existing dialog/toast/UI primitives, Vitest, Cargo test.

---

## File map

### Backend
- Modify: `src-tauri/src/projects/types.rs`
  - Add transport structs for file tree/search payloads.
- Modify: `src-tauri/src/projects/commands.rs`
  - Add worktree file-explorer commands.
  - Add path validation + command parsing helpers.
- Modify: `src-tauri/src/lib.rs`
  - Register new Tauri commands.
- Modify: `src-tauri/src/http_server/dispatch.rs`
  - Register WebSocket dispatch match arms.

### Frontend
- Create: `src/types/file-explorer.ts`
  - Dedicated TS transport types.
- Create: `src/services/file-explorer.ts`
  - Query/mutation hooks + query keys.
- Create: `src/components/projects/FileExplorerPanel.tsx`
  - Main panel mounted in project canvas.
- Create: `src/components/projects/FileExplorerTree.tsx`
  - Tree/search list renderer.
- Create: `src/components/projects/EditMarkdownModal.tsx`
  - Focused markdown editing modal.
- Modify: `src/components/dashboard/ProjectCanvasView.tsx`
  - Mount file explorer panel for selected/active worktree context.

### Tests
- Create: `src/components/projects/FileExplorerPanel.test.tsx`
- Create: `src/services/file-explorer.test.ts`
- Modify or create inline Rust tests in: `src-tauri/src/projects/commands.rs`

### Not needed
- No DB model changes.
- No `projects.json` schema changes.
- No delete flow.

---

## Task 1: Add backend transport types

**Files:**
- Modify: `src-tauri/src/projects/types.rs`
- Create/modify TS mirror: `src/types/file-explorer.ts`

- [ ] **Step 1: Add Rust response types**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeNode {
    pub relative_path: String,
    pub name: String,
    pub node_type: String,
    pub depth: u32,
    pub has_children: Option<bool>,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeResponse {
    pub root: String,
    pub nodes: Vec<FileTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSearchResult {
    pub relative_path: String,
    pub name: String,
    pub node_type: String,
}
```

- [ ] **Step 2: Add TS mirrors**

```ts
export type FileExplorerNodeType = 'file' | 'directory'

export interface FileTreeNode {
  relative_path: string
  name: string
  node_type: FileExplorerNodeType
  depth: number
  has_children?: boolean
  extension?: string
}

export interface FileTreeResponse {
  root: string
  nodes: FileTreeNode[]
}

export interface FileSearchResult {
  relative_path: string
  name: string
  node_type: FileExplorerNodeType
}
```

- [ ] **Step 3: Typecheck shape usage locally**

Run: `bun run typecheck`
Expected: passes or only unrelated pre-existing failures

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/projects/types.rs src/types/file-explorer.ts
git commit -m "feat: add file explorer transport types"
```

---

## Task 2: Add backend path validation helpers

**Files:**
- Modify: `src-tauri/src/projects/commands.rs`
- Test: inline Rust tests in same file

- [ ] **Step 1: Add failing Rust tests for path safety + markdown gating**

```rust
#[test]
fn markdown_extensions_are_allowed() {
    assert!(is_markdown_path(Path::new("README.md")));
    assert!(is_markdown_path(Path::new("docs/notes.markdown")));
    assert!(!is_markdown_path(Path::new("src/main.rs")));
}

#[test]
fn rejects_parent_escape_segments() {
    assert!(normalize_relative_worktree_path("../secret.md").is_err());
    assert!(normalize_relative_worktree_path("docs/../../secret.md").is_err());
}
```

- [ ] **Step 2: Implement minimal helpers**

```rust
fn is_markdown_path(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|ext| ext.to_str()),
        Some("md") | Some("markdown")
    )
}

fn normalize_relative_worktree_path(input: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(input);
    if path.is_absolute() {
        return Err("Path must be relative to worktree root".to_string());
    }

    if path
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err("Path cannot escape worktree root".to_string());
    }

    Ok(path)
}
```

- [ ] **Step 3: Add worktree resolution helper by ID**

```rust
fn resolve_worktree_root(app: &AppHandle, worktree_id: &str) -> Result<PathBuf, String> {
    let data = load_projects_data(app)?;
    let worktree = data
        .worktrees
        .iter()
        .find(|w| w.id == worktree_id)
        .ok_or_else(|| format!("Worktree not found: {worktree_id}"))?;
    Ok(PathBuf::from(&worktree.path))
}
```

- [ ] **Step 4: Run targeted Rust tests**

Run: `cd src-tauri && cargo test projects::commands`
Expected: new helper tests pass

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/projects/commands.rs
git commit -m "feat: add file explorer path helpers"
```

---

## Task 3: Implement `list_worktree_file_tree`

**Files:**
- Modify: `src-tauri/src/projects/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/http_server/dispatch.rs`

- [ ] **Step 1: Add a failing parser test for `eza --tree` output**

```rust
#[test]
fn parses_simple_eza_tree_output() {
    let stdout = "docs\n├── README.md\n└── notes\n    └── ideas.md\n";
    let nodes = parse_eza_tree_output(stdout);

    assert_eq!(nodes[0].relative_path, "docs");
    assert_eq!(nodes[1].relative_path, "docs/README.md");
    assert_eq!(nodes[1].node_type, "file");
}
```

- [ ] **Step 2: Implement the command using `silent_command()`**

```rust
#[tauri::command]
pub async fn list_worktree_file_tree(
    app: AppHandle,
    worktree_id: String,
    relative_path: Option<String>,
) -> Result<FileTreeResponse, String> {
    let root = resolve_worktree_root(&app, &worktree_id)?;
    let subtree = relative_path
        .as_deref()
        .map(normalize_relative_worktree_path)
        .transpose()?
        .map(|path| root.join(path))
        .unwrap_or_else(|| root.clone());

    let output = silent_command("eza")
        .arg("--tree")
        .arg("--all")
        .arg("--group-directories-first")
        .arg("--git-ignore")
        .current_dir(&root)
        .arg(&subtree)
        .output()
        .map_err(|e| format!("Failed to run eza: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "eza --tree failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(FileTreeResponse {
        root: root.to_string_lossy().to_string(),
        nodes: parse_eza_tree_output(&stdout),
    })
}
```

- [ ] **Step 3: Register the command in both command registries**

```rust
// src-tauri/src/lib.rs
projects::list_worktree_file_tree,

// src-tauri/src/http_server/dispatch.rs
"list_worktree_file_tree" => {
    let worktree_id: String = field(&args, "worktreeId", "worktree_id")?;
    let relative_path: Option<String> = field_opt(&args, "relativePath", "relative_path")?;
    let result = crate::projects::list_worktree_file_tree(app.clone(), worktree_id, relative_path).await?;
    to_value(result)
}
```

- [ ] **Step 4: Run targeted Rust tests**

Run: `cd src-tauri && cargo test list_worktree_file_tree`
Expected: parser/command tests pass

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/projects/commands.rs src-tauri/src/lib.rs src-tauri/src/http_server/dispatch.rs
git commit -m "feat: add worktree file tree command"
```

---

## Task 4: Implement `search_worktree_files`

**Files:**
- Modify: `src-tauri/src/projects/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/http_server/dispatch.rs`

- [ ] **Step 1: Add a failing parser test for `fd` output**

```rust
#[test]
fn parses_fd_output_into_search_results() {
    let stdout = "docs/README.md\nsrc/components\n";
    let results = parse_fd_output(stdout);

    assert_eq!(results[0].relative_path, "docs/README.md");
    assert_eq!(results[0].name, "README.md");
}
```

- [ ] **Step 2: Implement the command with empty-query guard**

```rust
#[tauri::command]
pub async fn search_worktree_files(
    app: AppHandle,
    worktree_id: String,
    query: String,
) -> Result<Vec<FileSearchResult>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let root = resolve_worktree_root(&app, &worktree_id)?;
    let output = silent_command("fd")
        .arg(trimmed)
        .arg(".")
        .current_dir(&root)
        .output()
        .map_err(|e| format!("Failed to run fd: {e}"))?;

    if !output.status.success() {
        return Err(format!("fd failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_fd_output(&stdout))
}
```

- [ ] **Step 3: Register the command**

```rust
// src-tauri/src/lib.rs
projects::search_worktree_files,

// src-tauri/src/http_server/dispatch.rs
"search_worktree_files" => {
    let worktree_id: String = field(&args, "worktreeId", "worktree_id")?;
    let query: String = from_field(&args, "query")?;
    let result = crate::projects::search_worktree_files(app.clone(), worktree_id, query).await?;
    to_value(result)
}
```

- [ ] **Step 4: Run targeted Rust tests**

Run: `cd src-tauri && cargo test search_worktree_files`
Expected: search parser/command tests pass

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/projects/commands.rs src-tauri/src/lib.rs src-tauri/src/http_server/dispatch.rs
git commit -m "feat: add worktree file search command"
```

---

## Task 5: Implement markdown read/write commands

**Files:**
- Modify: `src-tauri/src/projects/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/http_server/dispatch.rs`

- [ ] **Step 1: Add failing tests for markdown-only read/write**

```rust
#[test]
fn rejects_non_markdown_reads() {
    let path = Path::new("src/main.rs");
    assert!(!is_markdown_path(path));
}
```

- [ ] **Step 2: Implement read/write commands**

```rust
#[tauri::command]
pub async fn read_worktree_markdown_file(
    app: AppHandle,
    worktree_id: String,
    relative_path: String,
) -> Result<String, String> {
    let root = resolve_worktree_root(&app, &worktree_id)?;
    let relative = normalize_relative_worktree_path(&relative_path)?;
    let absolute = root.join(&relative);

    if !is_markdown_path(&absolute) {
        return Err("Only markdown files can be edited".to_string());
    }

    std::fs::read_to_string(&absolute)
        .map_err(|e| format!("Failed to read markdown file: {e}"))
}

#[tauri::command]
pub async fn write_worktree_markdown_file(
    app: AppHandle,
    worktree_id: String,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let root = resolve_worktree_root(&app, &worktree_id)?;
    let relative = normalize_relative_worktree_path(&relative_path)?;
    let absolute = root.join(&relative);

    if !is_markdown_path(&absolute) {
        return Err("Only markdown files can be edited".to_string());
    }

    std::fs::write(&absolute, content)
        .map_err(|e| format!("Failed to write markdown file: {e}"))
}
```

- [ ] **Step 3: Register both commands**

```rust
// src-tauri/src/lib.rs
projects::read_worktree_markdown_file,
projects::write_worktree_markdown_file,

// src-tauri/src/http_server/dispatch.rs
"read_worktree_markdown_file" => { /* extract worktreeId + relativePath */ }
"write_worktree_markdown_file" => { /* extract worktreeId + relativePath + content */ }
```

- [ ] **Step 4: Run targeted Rust tests**

Run: `cd src-tauri && cargo test markdown_file`
Expected: markdown guard tests pass

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/projects/commands.rs src-tauri/src/lib.rs src-tauri/src/http_server/dispatch.rs
git commit -m "feat: add worktree markdown edit commands"
```

---

## Task 6: Add frontend service hooks

**Files:**
- Create: `src/services/file-explorer.ts`
- Create: `src/types/file-explorer.ts`
- Test: `src/services/file-explorer.test.ts`

- [ ] **Step 1: Add a failing hook/query-key test**

```ts
it('builds stable query keys for tree and search', () => {
  expect(fileExplorerQueryKeys.tree('w1', '')).toEqual([
    'file-explorer',
    'tree',
    'w1',
    '',
  ])
})
```

- [ ] **Step 2: Implement query keys + hooks**

```ts
export const fileExplorerQueryKeys = {
  all: ['file-explorer'] as const,
  tree: (worktreeId: string, relativePath = '') =>
    [...fileExplorerQueryKeys.all, 'tree', worktreeId, relativePath] as const,
  search: (worktreeId: string, query: string) =>
    [...fileExplorerQueryKeys.all, 'search', worktreeId, query] as const,
}

export function useWorktreeFileTree(worktreeId: string | null) {
  return useQuery({
    queryKey: fileExplorerQueryKeys.tree(worktreeId ?? '', ''),
    queryFn: () => invoke<FileTreeResponse>('list_worktree_file_tree', { worktreeId }),
    enabled: !!worktreeId,
  })
}
```

- [ ] **Step 3: Add markdown read/write hooks**

```ts
export function useWriteMarkdownFile(worktreeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { relativePath: string; content: string }) => {
      await invoke('write_worktree_markdown_file', {
        worktreeId,
        relativePath: input.relativePath,
        content: input.content,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileExplorerQueryKeys.all })
    },
  })
}
```

- [ ] **Step 4: Run frontend tests**

Run: `bun run test:run src/services/file-explorer.test.ts`
Expected: tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/file-explorer.ts src/types/file-explorer.ts src/services/file-explorer.test.ts
git commit -m "feat: add file explorer service hooks"
```

---

## Task 7: Build markdown edit modal

**Files:**
- Create: `src/components/projects/EditMarkdownModal.tsx`
- Reuse patterns from: `src/components/chat/FileContentModal.tsx`
- Test: `src/components/projects/FileExplorerPanel.test.tsx`

- [ ] **Step 1: Add a failing modal interaction test**

```tsx
it('opens markdown editor and saves changes', async () => {
  render(<EditMarkdownModal /* mocked props */ />)
  await user.type(screen.getByRole('textbox'), 'updated')
  await user.click(screen.getByRole('button', { name: /save/i }))
  expect(mockSave).toHaveBeenCalled()
})
```

- [ ] **Step 2: Implement the minimal modal**

```tsx
export function EditMarkdownModal({
  open,
  filePath,
  content,
  isSaving,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(content)

  useEffect(() => {
    if (open) setDraft(content)
  }, [open, content])

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent>
        <DialogTitle>{filePath}</DialogTitle>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(draft)} disabled={isSaving}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Run the modal test**

Run: `bun run test:run src/components/projects/FileExplorerPanel.test.tsx`
Expected: modal interaction test passes

- [ ] **Step 4: Commit**

```bash
git add src/components/projects/EditMarkdownModal.tsx src/components/projects/FileExplorerPanel.test.tsx
git commit -m "feat: add markdown edit modal"
```

---

## Task 8: Build tree/search list UI

**Files:**
- Create: `src/components/projects/FileExplorerTree.tsx`
- Create: `src/components/projects/FileExplorerPanel.tsx`
- Test: `src/components/projects/FileExplorerPanel.test.tsx`

- [ ] **Step 1: Add failing tree/search render tests**

```tsx
it('shows tree rows when search is empty', () => {
  render(<FileExplorerPanel /* mocked tree data */ />)
  expect(screen.getByText('README.md')).toBeInTheDocument()
})

it('switches to search results when query is non-empty', async () => {
  render(<FileExplorerPanel /* mocked hooks */ />)
  await user.type(screen.getByPlaceholderText(/search files/i), 'readme')
  expect(screen.getByText('docs/README.md')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement tree renderer with minimal actions**

```tsx
function isMarkdown(path: string) {
  return /\.(md|markdown)$/i.test(path)
}

<Button onClick={() => copyToClipboard(node.relative_path)}>Copy</Button>
{isMarkdown(node.relative_path) && (
  <Button onClick={() => onEdit(node.relative_path)}>Edit</Button>
)}
```

- [ ] **Step 3: Implement panel state**

```tsx
const [query, setQuery] = useState('')
const [selectedPath, setSelectedPath] = useState<string | null>(null)
const [editingPath, setEditingPath] = useState<string | null>(null)
const isSearchMode = query.trim().length > 0
```

- [ ] **Step 4: Add toast-based copy/save feedback**

```tsx
copyToClipboard(path)
toast.success('Path copied')
```

- [ ] **Step 5: Run component tests**

Run: `bun run test:run src/components/projects/FileExplorerPanel.test.tsx`
Expected: tree/search/copy/edit visibility tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/projects/FileExplorerPanel.tsx src/components/projects/FileExplorerTree.tsx src/components/projects/FileExplorerPanel.test.tsx
git commit -m "feat: build file explorer panel"
```

---

## Task 9: Mount the panel in project canvas

**Files:**
- Modify: `src/components/dashboard/ProjectCanvasView.tsx`
- Test: `src/components/projects/FileExplorerPanel.test.tsx`

- [ ] **Step 1: Add a failing integration test or smoke test**

```tsx
it('renders file explorer in project canvas when a worktree is available', () => {
  render(<ProjectCanvasView projectId="p1" />)
  expect(screen.getByText(/file explorer/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Mount the panel surgically**

```tsx
<FileExplorerPanel
  worktreeId={selectedWorktree?.id ?? null}
  worktreePath={selectedWorktree?.path ?? null}
/>
```

Implementation note:
- Prefer the currently selected worktree.
- If no worktree is selected, use the first visible non-base worktree.
- If none exist, render nothing.

- [ ] **Step 3: Verify canvas layout manually**

Run: `bun run dev`
Expected: panel appears in project canvas without breaking existing worktree/session controls

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/ProjectCanvasView.tsx
 git commit -m "feat: mount file explorer in project canvas"
```

---

## Task 10: Full verification

**Files:**
- Verify only

- [ ] **Step 1: Run frontend typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 2: Run focused frontend tests**

Run: `bun run test:run src/components/projects/FileExplorerPanel.test.tsx src/services/file-explorer.test.ts`
Expected: PASS

- [ ] **Step 3: Run Rust tests**

Run: `bun run rust:test`
Expected: PASS

- [ ] **Step 4: Run lint if changed code touches style-sensitive areas**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 5: Manual verification checklist**

```text
1. Open a project canvas with at least one worktree.
2. Confirm File Explorer panel renders.
3. Expand/collapse folders in tree mode.
4. Search by filename and by partial relative path.
5. Clear search and confirm tree returns.
6. Copy a file path and paste it elsewhere.
7. Open a .md file, edit content, save.
8. Reopen same file and confirm saved content persists.
9. Confirm non-markdown files do not show Edit.
10. Confirm no delete UI exists.
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: verify file explorer feature"
```

---

## Notes for implementer

- Prefer a dedicated `src/types/file-explorer.ts` over expanding `src/types/projects.ts`; this keeps the write set focused.
- Reuse existing copy helper if available instead of calling browser clipboard APIs directly.
- Do not reuse generic `read_file_content` / `write_file_content` for this feature; keep worktree-scoped markdown editing behind dedicated commands.
- Keep the parser simple. If `eza --tree` output becomes too brittle, fall back to building a typed tree from `ignore::WalkBuilder` while still using `eza --tree` for the required shell path; document that deviation in code comments only if necessary.
- Match existing toast/query patterns from `src/services/projects.ts` and `src/components/chat/FileContentModal.tsx`.
- Do not add persistence unless a real UX need appears during implementation.

## Self-review

### Spec coverage
- tree: covered by Tasks 3, 8, 9
- navigation/expand-collapse: covered by Task 8
- search by name + path: covered by Tasks 4, 8
- copy path: covered by Task 8
- markdown edit modal: covered by Tasks 5, 7, 8
- Tauri backend APIs: covered by Tasks 2–5
- DB models consideration: explicitly no DB changes in file map and notes
- project canvas placement: covered by Task 9

### Placeholder scan
- No TBD/TODO placeholders.
- Commands and files are explicit.
- Verification commands are explicit.

### Type consistency
- Rust/TS shapes consistently use `relative_path`, `name`, `node_type`.
- Commands consistently use `worktreeId/worktree_id` and `relativePath/relative_path`.
