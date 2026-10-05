//! TrainingLab desktop host.
//!
//! The shell is deliberately thin: the entire app is the web bundle in
//! `../dist`, and all state lives in the WebView's IndexedDB. The only things
//! the host adds are the capabilities a browser cannot provide —
//!
//!   * **native notifications** (`tauri-plugin-notification`), so the rest-timer
//!     alert is a real Windows toast even when the window is in the background;
//!     the Web Notification API is a no-op inside a WebView, which is exactly
//!     why this plugin is here; and
//!   * **opening external links** (`tauri-plugin-opener`) for the BodyLab LAN
//!     address the app prints on the phone-testing card.
//!
//! No filesystem, shell or HTTP plugin is registered. TrainingLab talks to the
//! optional local coach and the optional LAN store over plain `fetch`, both on
//! loopback, which the CSP in `tauri.conf.json` allows explicitly — nothing else
//! is reachable from the WebView.
//!
//! The one filesystem capability that DOES exist is the pair of commands below,
//! and it is narrow on purpose: IndexedDB lives inside the WebView profile
//! (`%LOCALAPPDATA%\com.traininglab.desktop\EBWebView\…`), which Windows,
//! WebView2 itself or a careless reinstall can reset without warning — and the
//! owner lost a training log to exactly that on 2026-10-05. `write_autobackup`
//! and `read_autobackup` mirror the log to a JSON file OUTSIDE that profile,
//! under the app data dir, so the data survives even if IndexedDB does not.
//! They take no path argument: the directory is computed here, so the WebView
//! cannot use them to read or write anywhere it likes.

use tauri::Manager;

/// How many automatic snapshots to keep. Each one is a full log; eight is a few
/// megabytes at most and buys a real window to notice and act.
const KEEP_SNAPSHOTS: usize = 8;

fn backup_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?
        .join("backups");
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {e}", dir.display()))?;
    Ok(dir)
}

/// Milliseconds since the epoch, without pulling in a date library for it.
fn epoch_millis() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// Snapshot files sort lexicographically by timestamp because the name is
/// zero-padded to a fixed width — no parsing needed to find the newest.
fn snapshot_files(dir: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut files: Vec<std::path::PathBuf> = std::fs::read_dir(dir)
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .map(|e| e.path())
                .filter(|p| {
                    p.is_file()
                        && p.extension().and_then(|e| e.to_str()) == Some("json")
                        && p.file_name()
                            .and_then(|n| n.to_str())
                            .is_some_and(|n| n.starts_with("traininglab-"))
                })
                .collect()
        })
        .unwrap_or_default();
    files.sort();
    files.reverse();
    files
}

/// Write the full log to a timestamped file outside the WebView profile and
/// return its path (shown in Settings so the owner knows it exists).
#[tauri::command]
fn write_autobackup(app: tauri::AppHandle, contents: String) -> Result<String, String> {
    // A snapshot that is not valid JSON is worse than none: it would be offered
    // as a restore that can never succeed.
    serde_json::from_str::<serde_json::Value>(&contents)
        .map_err(|e| format!("autobackup payload is not JSON: {e}"))?;

    let dir = backup_dir(&app)?;
    let path = dir.join(format!("traininglab-{:020}.json", epoch_millis()));
    std::fs::write(&path, contents).map_err(|e| format!("cannot write {}: {e}", path.display()))?;

    for stale in snapshot_files(&dir).into_iter().skip(KEEP_SNAPSHOTS) {
        let _ = std::fs::remove_file(stale);
    }
    Ok(path.to_string_lossy().into_owned())
}

/// The newest snapshot, or `None` when there is nothing to restore from.
#[tauri::command]
fn read_autobackup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = backup_dir(&app)?;
    for path in snapshot_files(&dir) {
        if let Ok(text) = std::fs::read_to_string(&path) {
            return Ok(Some(text));
        }
    }
    Ok(None)
}

/// Where the snapshots live, for the Settings card.
#[tauri::command]
fn autobackup_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(backup_dir(&app)?.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            write_autobackup,
            read_autobackup,
            autobackup_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running TrainingLab");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_names_sort_by_age() {
        // Zero-padded millis: a plain lexicographic sort is a chronological one,
        // which is what `snapshot_files` relies on.
        let a = "traininglab-00000000000000000100.json";
        let b = "traininglab-00000000000000009999.json";
        assert!(a < b);
    }
}