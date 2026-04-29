src-tauri/src/chat/types.rs:
⋮
│pub enum ThinkingLevel {
│    Off,
│    Think,
│    Megathink,
│    #[default]
│    Ultrathink,
⋮
│pub enum EffortLevel {
│    /// Don't send effort (used when thinking is disabled for mode)
│    Off,
│    Low,
│    Medium,
│    #[default]
│    High,
│    Xhigh,
│    Max,
⋮
│pub struct ClaudeContext {
│    pub worktree_path: String,
│    // Future: pub additional_files: Vec<String>,
│    // Future: pub custom_instructions: Option<String>,
⋮
│pub struct WorktreeIndex {
│    /// Worktree ID for reference
│    pub worktree_id: String,
│    /// ID of the active/displayed session tab
│    #[serde(default)]
│    pub active_session_id: Option<String>,
│    /// Lightweight session entries for tab rendering
│    pub sessions: Vec<SessionIndexEntry>,
│    /// Storage format version for migrations
│    #[serde(default = "default_version")]
⋮
│pub struct WorktreeSessions {
│    /// Worktree ID for reference
│    pub worktree_id: String,
│    /// All sessions in this worktree
│    pub sessions: Vec<Session>,
│    /// ID of the active/displayed session tab
│    #[serde(default)]
│    pub active_session_id: Option<String>,
│    /// Default model for new sessions in this worktree (unused, kept for compatibility)
│    #[serde(default)]
⋮
│pub struct SessionMetadata {
│    /// Unique session identifier (UUID v4)
│    #[serde(alias = "session_id")]
│    pub id: String,
│    /// Worktree this session belongs to
│    pub worktree_id: String,
│    /// Display name ("Session 1", or user-customized name)
│    #[serde(alias = "session_name")]
│    pub name: String,
│    /// Order index for tab ordering (0-indexed)
⋮
│impl SessionMetadata {
│    /// Create a new metadata for a session
│    pub fn new(session_id: String, worktree_id: String, session_name: String, order: u32) -> Self {
│        Self {
│            id: session_id,
│            worktree_id,
│            name: session_name,
│            order,
│            created_at: std::time::SystemTime::now()
│                .duration_since(std::time::UNIX_EPOCH)
⋮
│    /// Convert to a lightweight index entry for tab rendering
│    pub fn to_index_entry(&self) -> SessionIndexEntry {
│        // Count messages: each run has 1 user message, plus 1 assistant message if completed
│        let message_count: u32 = self
│            .runs
│            .iter()
│            .map(|run| {
│                let is_undo_send =
│                    run.status == RunStatus::Cancelled && run.assistant_message_id.is_none();
│                if is_undo_send {
│                    0
⋮

src-tauri/src/http_server/mod.rs:
⋮
│/// Managed as Tauri state so any code with an AppHandle can broadcast.
│pub struct WsBroadcaster {
│    tx: broadcast::Sender<WsEvent>,
│    /// Per-session ring buffer for event replay on WebSocket reconnect.
│    /// Key: session_id extracted from the event payload.
│    session_buffers: Mutex<HashMap<String, VecDeque<(u64, Arc<str>)>>>,
⋮

src-tauri/src/platform/process.rs:
⋮
│pub fn ensure_macos_path() {
│    use std::sync::Once;
│    static INIT: Once = Once::new();
│    INIT.call_once(|| {
│        let start = std::time::Instant::now();
│        crate::fix_macos_path();
│        log::info!(
│            "fix_macos_path() completed in {:?} (lazy, on first CLI invocation)",
│            start.elapsed()
│        );
⋮
│/// Do NOT use for commands that intentionally open UI (terminals, editors, file explorers).
│pub fn silent_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
│    // Ensure macOS GUI app has the user's full PATH before spawning any subprocess.
│    // Lazy + cached via Once — only the first call pays the shell-spawn cost (~100-500ms).
│    #[cfg(target_os = "macos")]
│    ensure_macos_path();
│
│    #[allow(unused_mut)]
│    let mut cmd = Command::new(program);
│    #[cfg(windows)]
│    {
⋮
│pub fn kill_process(pid: u32) -> Result<(), String> {
│    let result = unsafe { libc::kill(pid as i32, libc::SIGKILL) };
│    if result == 0 {
│        Ok(())
│    } else {
│        Err(format!(
│            "Failed to kill process {}: {}",
│            pid,
│            std::io::Error::last_os_error()
│        ))
⋮
│pub fn kill_process(pid: u32) -> Result<(), String> {
│    use windows_sys::Win32::Foundation::CloseHandle;
│    use windows_sys::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
│
│    unsafe {
│        let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
│        if handle.is_null() {
│            return Err(format!(
│                "Failed to open process {}: {}",
│                pid,
⋮

src-tauri/src/projects/types.rs:
⋮
│pub enum RunScript {
│    Single(String),
│    Multiple(Vec<String>),
⋮
│pub struct ProjectsData {
│    pub projects: Vec<Project>,
│    pub worktrees: Vec<Worktree>,
⋮
│impl ProjectsData {
│    /// Get all worktrees for a specific project
│    pub fn worktrees_for_project(&self, project_id: &str) -> Vec<&Worktree> {
│        self.worktrees
│            .iter()
│            .filter(|w| w.project_id == project_id)
│            .collect()
│    }
│
│    /// Find a project by ID
│    pub fn find_project(&self, id: &str) -> Option<&Project> {
│        self.projects.iter().find(|p| p.id == id)
⋮
│    /// Get children (projects/folders) of a parent (None = root level)
│    pub fn get_children(&self, parent_id: Option<&str>) -> Vec<&Project> {
│        self.projects
│            .iter()
│            .filter(|p| p.parent_id.as_deref() == parent_id)
│            .collect()
⋮
│    /// Get nesting level of an item (0 = root)
│    pub fn get_nesting_level(&self, project_id: &str) -> u32 {
│        let mut level = 0;
│        let mut current_id = Some(project_id.to_string());
│        while let Some(id) = current_id {
│            if let Some(p) = self.find_project(&id) {
│                current_id = p.parent_id.clone();
│                if current_id.is_some() {
│                    level += 1;
│                }
│            } else {
⋮
│    /// Get max subtree depth from an item (how deep its descendants go)
│    pub fn get_max_subtree_depth(&self, item_id: &str) -> u32 {
│        let children: Vec<&Project> = self
│            .projects
│            .iter()
│            .filter(|p| p.parent_id.as_deref() == Some(item_id))
│            .collect();
│
│        if children.is_empty() {
│            return 0;
│        }
│
⋮

src-tauri/src/terminal/registry.rs:
⋮
│/// Execute a function with mutable access to a terminal session
│pub fn with_terminal<F, R>(terminal_id: &str, f: F) -> Option<R>
⋮

src/components/ui/date-picker.tsx:
⋮
│interface DatePickerProps {
│  value?: Date
│  onChange?: (date: Date | undefined) => void
│  placeholder?: string
│  className?: string
⋮

src/lib/transport.ts:
⋮
│interface WsMessage {
│  type: 'response' | 'error' | 'event'
│  id?: string
│  data?: unknown
│  error?: string
│  event?: string
│  payload?: unknown
│  /** Monotonic sequence number for event replay on reconnect. */
│  seq?: number
⋮
│class WsTransport {
│  private ws: WebSocket | null = null
│  private pending = new Map<string, PendingRequest>()
│  private listeners = new Map<
│    string,
│    Set<(event: { payload: unknown }) => void>
│  >()
│  private reconnectAttempt = 0
│  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
│  private connectWatchdog: ReturnType<typeof setTimeout> | null = null
⋮

src/types/chat.ts:
⋮
│export type ThinkingLevel = 'off' | 'think' | 'megathink' | 'ultrathink'
│
⋮
│export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
│
⋮
│export type ExecutionMode = 'plan' | 'build' | 'yolo'
│
⋮
│export interface WorktreeSessions {
│  /** Worktree ID for reference */
│  worktree_id: string
│  /** All sessions in this worktree */
│  sessions: Session[]
│  /** ID of the active/displayed session tab */
│  active_session_id: string | null
│  /** Default model for new sessions in this worktree */
│  default_model?: string
│  /** Storage format version for migrations */
⋮

src/types/keybindings.ts:
⋮
│export type KeybindingAction =
│  | 'focus_chat_input'
│  | 'toggle_left_sidebar'
│  | 'open_preferences'
│  | 'open_commit_modal'
│  | 'open_git_diff'
│  | 'execute_run'
│  | 'open_in_modal'
│  | 'open_magic_modal'
│  | 'new_session'
⋮
│export type ShortcutString = string
│
⋮
│export type KeybindingsMap = Record<string, ShortcutString>
│
⋮
