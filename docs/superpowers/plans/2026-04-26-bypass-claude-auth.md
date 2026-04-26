# Bypass Claude Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to bypass the Claude CLI authentication check, which is necessary when using custom binaries like `claude.ccr` that don't require the standard login pattern.

**Architecture:** Add a `bypass_claude_auth` flag to `AppPreferences`. Update the backend `check_claude_cli_auth` command to respect this flag. Update the frontend onboarding and setup-incomplete banners to handle this state correctly.

**Tech Stack:** Rust (Tauri), TypeScript (React, Zustand, TanStack Query)

---

### Task 1: Update AppPreferences in Rust

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add bypass_claude_auth to AppPreferences struct**

```rust
// In AppPreferences struct in src-tauri/src/lib.rs
pub struct AppPreferences {
    // ... existing fields ...
    #[serde(default)]
    pub bypass_claude_auth: bool,
    // ... rest of fields ...
}
```

- [ ] **Step 2: Add default function for bypass_claude_auth**

```rust
fn default_false() -> bool {
    false
}
```
And use `#[serde(default = "default_false")]` if `#[serde(default)]` is not enough (though for bool it defaults to false).

- [ ] **Step 3: Update update_preferences command if needed**
Check if `update_preferences` needs changes to handle the new field.

---

### Task 2: Update AppPreferences in TypeScript

**Files:**
- Modify: `src/types/preferences.ts`

- [ ] **Step 1: Add bypass_claude_auth to AppPreferences interface**

```typescript
export interface AppPreferences {
  // ... existing fields ...
  bypass_claude_auth: boolean
  // ... rest of fields ...
}
```

- [ ] **Step 2: Update defaultPreferences object**

```typescript
export const defaultPreferences: AppPreferences = {
  // ... existing fields ...
  bypass_claude_auth: false,
}
```

---

### Task 3: Update check_claude_cli_auth in Rust

**Files:**
- Modify: `src-tauri/src/claude_cli/commands.rs`

- [ ] **Step 1: Update check_claude_cli_auth to respect the bypass flag**

```rust
pub async fn check_claude_cli_auth(app: AppHandle) -> Result<ClaudeAuthStatus, String> {
    log::trace!("Checking Claude CLI authentication status");

    // Check if bypass is enabled in preferences
    let bypass = match crate::get_preferences_path(&app) {
        Ok(prefs_path) => {
            if let Ok(contents) = std::fs::read_to_string(&prefs_path) {
                if let Ok(prefs) = serde_json::from_str::<crate::AppPreferences>(&contents) {
                    prefs.bypass_claude_auth
                } else {
                    false
                }
            } else {
                false
            }
        }
        Err(_) => false,
    };

    if bypass {
        log::info!("Claude auth check bypassed via preference");
        return Ok(ClaudeAuthStatus {
            authenticated: true,
            error: None,
        });
    }

    // ... existing check logic ...
}
```

---

### Task 4: Add UI Toggle to General Settings

**Files:**
- Modify: `src/components/preferences/panes/GeneralPane.tsx`

- [ ] **Step 1: Add the toggle to the Claude CLI settings section**

Find the section where Claude CLI settings are (source, etc.) and add a new toggle for "Bypass Login Requirement".

---

### Task 5: Verification

- [ ] **Step 1: Verify the setting persists**
- [ ] **Step 2: Verify that when enabled, onboarding doesn't block Claude even if not logged in**
- [ ] **Step 3: Verify the banner for incomplete setup disappears if Claude is the only remaining item and bypass is on**
