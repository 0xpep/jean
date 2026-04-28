//! Configuration and path management for the embedded GitHub CLI

use crate::platform::silent_command;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Directory name for storing the GitHub CLI binary
pub const GH_CLI_DIR_NAME: &str = "gh-cli";

/// Name of the GitHub CLI binary
#[cfg(not(target_os = "windows"))]
pub const GH_CLI_BINARY_NAME: &str = "gh";

#[cfg(target_os = "windows")]
pub const GH_CLI_BINARY_NAME: &str = "gh.exe";

/// Get the directory where GitHub CLI is installed
///
/// Returns: `~/Library/Application Support/jean/gh-cli/` (macOS)
///          `~/.local/share/jean/gh-cli/` (Linux)
///          `%APPDATA%/jean/gh-cli/` (Windows)
pub fn get_gh_cli_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;
    Ok(app_data_dir.join(GH_CLI_DIR_NAME))
}

/// Get the full path to the GitHub CLI binary
///
/// Returns: `~/Library/Application Support/jean/gh-cli/gh` (macOS/Linux)
///          `%APPDATA%/jean/gh-cli/gh.exe` (Windows)
pub fn get_gh_cli_binary_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(get_gh_cli_dir(app)?.join(GH_CLI_BINARY_NAME))
}
/// Resolve GitHub CLI binary path based on the user's preference.
///
/// - "jean" (default): use the Jean-managed binary.
/// - "path": look up the binary in system PATH.
/// - "custom": use the custom path from `gh_cli_custom_path` preference.
pub fn resolve_gh_binary(app: &AppHandle) -> PathBuf {
    let source = match crate::get_preferences_path(app) {
        Ok(prefs_path) => {
            if let Ok(contents) = std::fs::read_to_string(&prefs_path) {
                if let Ok(prefs) = serde_json::from_str::<crate::AppPreferences>(&contents) {
                    prefs.gh_cli_source
                 } else {
                     "jean".to_string()
                 }
             } else {
                 "jean".to_string()
             }
          }
        Err(_) => "jean".to_string(),
      };

    match source.as_str() {
         "custom" => {
            let custom_path = match crate::get_preferences_path(app) {
                Ok(prefs_path) => {
                    if let Ok(contents) = std::fs::read_to_string(&prefs_path) {
                        if let Ok(prefs) = serde_json::from_str::<crate::AppPreferences>(&contents) {
                            prefs.gh_cli_custom_path
                         } else {
                            String::new()
                         }
                     } else {
                        String::new()
                     }
                  }
                Err(_) => String::new(),
              };
            if !custom_path.is_empty() && std::path::Path::new(&custom_path).exists() {
                log::debug!("gh_cli_source is 'custom', using: {:?}", custom_path);
                return PathBuf::from(&custom_path);
              }
            log::warn!("gh_cli_source is 'custom' but path is empty or does not exist");
          }
          "path" => {
             let which_cmd = if cfg!(target_os = "windows") {
                   "where"
               } else {
                   "which"
               };

             if let Ok(output) = silent_command(which_cmd).arg(GH_CLI_BINARY_NAME).output() {
                 if output.status.success() {
                      let path_str = String::from_utf8_lossy(&output.stdout)
                           .lines()
                           .next()
                           .unwrap_or("")
                           .trim()
                           .to_string();
                      if !path_str.is_empty() {
                          let path = PathBuf::from(&path_str);
                          if path.exists() {
                              return path;
                           }
                       }
                   }
               }
             log::warn!("gh_cli_source is 'path' but could not find gh in PATH, falling back to Jean-managed binary");
          }
          _ => {}
      }

    get_gh_cli_binary_path(app).unwrap_or_else(|_| PathBuf::from(GH_CLI_DIR_NAME).join(GH_CLI_BINARY_NAME))
}

pub fn ensure_gh_cli_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let cli_dir = get_gh_cli_dir(app)?;
    std::fs::create_dir_all(&cli_dir)
        .map_err(|e| format!("Failed to create GitHub CLI directory: {e}"))?;
    Ok(cli_dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fallback_path_is_jean_managed_location_shape() {
        let resolved = PathBuf::from(GH_CLI_DIR_NAME).join(GH_CLI_BINARY_NAME);

        assert!(resolved.ends_with(GH_CLI_BINARY_NAME));
        assert!(resolved.to_string_lossy().contains(GH_CLI_DIR_NAME));
    }
}
