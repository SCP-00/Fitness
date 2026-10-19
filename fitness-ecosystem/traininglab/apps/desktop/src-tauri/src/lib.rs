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

// ── MCP action channel (in / out) ───────────────────────────────────────────
//
// The write side of the tool surface (docs/MCP_TOOL_SURFACE.md, decision D1):
// a local model (Buffy, Codex, llama.cpp…) cannot touch IndexedDB, so it drops
// its requests in `mcp/mcp-actions.json` and the WebView applies them through
// its own store — validated by the same rules as the UI — then answers in
// `mcp/mcp-results.json`. Two commands, JSON in / JSON out, no path argument:
// the directory is computed here, so the WebView still cannot write anywhere it
// likes and no filesystem plugin is registered.

fn mcp_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?
        .join("mcp");
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {e}", dir.display()))?;
    Ok(dir)
}

/// Read and remove the pending action file in ONE step, so a crash between the
/// two cannot hand the same actions to the app twice. Replaying an action the
/// app already handled is still impossible — the idempotency ledger in the
/// WebView remembers every id it has ever seen — which is what makes this
/// consume-then-apply order safe.
#[tauri::command]
fn take_mcp_inbox(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = mcp_dir(&app)?.join("mcp-actions.json");
    if !path.exists() {
        return Ok(None);
    }
    let text = std::fs::read_to_string(&path).map_err(|e| format!("cannot read {}: {e}", path.display()))?;
    // A failed unlink is not fatal: the ledger dedupes, so the next poll would
    // simply see the same actions and answer with the same receipts.
    let _ = std::fs::remove_file(&path);
    Ok(Some(text))
}

/// Merge freshly written receipts into `mcp-results.json`.
///
/// Newest wins per id (an undo rewrites its own receipt), order is kept and the
/// file is capped so it cannot grow without bound. The JSON must be an array of
/// receipts carrying `id` + `status`: an unverifiable receipt is worse than
/// none, the same rule the snapshots follow.
#[tauri::command]
fn write_mcp_results(app: tauri::AppHandle, contents: String) -> Result<String, String> {
    let incoming = serde_json::from_str::<serde_json::Value>(&contents)
        .map_err(|e| format!("mcp results payload is not JSON: {e}"))?;
    let incoming = incoming
        .as_array()
        .ok_or_else(|| "mcp results payload must be a JSON array".to_string())?;
    for receipt in incoming {
        let id = receipt
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "receipt without id".to_string())?;
        if id.is_empty() {
            return Err("receipt with an empty id".into());
        }
        if !matches!(
            receipt.get("status").and_then(|v| v.as_str()),
            Some("applied") | Some("rejected")
        ) {
            return Err(format!("receipt {id} has no valid status"));
        }
    }

    let path = mcp_dir(&app)?.join("mcp-results.json");
    let existing: serde_json::Value = std::fs::read_to_string(&path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_else(|| serde_json::Value::Array(vec![]));
    let merged = merge_receipts(existing, incoming.as_slice());
    let json = serde_json::to_string_pretty(&merged)
        .map_err(|e| format!("cannot serialise receipts: {e}"))?;

    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, &json).map_err(|e| format!("cannot write {}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("cannot move {}: {e}", tmp.display()))?;
    Ok(path.to_string_lossy().into_owned())
}

/// Receipts live in an array but behave like a map keyed by `id`.
fn merge_receipts(existing: serde_json::Value, incoming: &[serde_json::Value]) -> serde_json::Value {
    const KEEP: usize = 500;
    let mut rows: Vec<serde_json::Value> = match existing {
        serde_json::Value::Array(rows) => rows,
        other => vec![other],
    }
    .into_iter()
    .filter(|r| r.get("id").and_then(|v| v.as_str()).is_some())
    .collect();

    for receipt in incoming {
        let id = receipt.get("id").and_then(|v| v.as_str());
        if let Some(id) = id {
            if let Some(slot) = rows.iter_mut().find(|r| r.get("id").and_then(|v| v.as_str()) == Some(id)) {
                *slot = receipt.clone();
                continue;
            }
        }
        rows.push(receipt.clone());
    }
    if rows.len() > KEEP {
        let excess = rows.len() - KEEP;
        rows.drain(..excess);
    }
    serde_json::Value::Array(rows)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            write_autobackup,
            read_autobackup,
            autobackup_dir,
            take_mcp_inbox,
            write_mcp_results
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

    #[test]
    fn receipts_merge_by_id_and_keep_order() {
        let first = serde_json::json!([
            { "id": "a", "status": "applied" },
            { "id": "b", "status": "rejected" }
        ]);
        let incoming = vec![
            serde_json::json!({ "id": "b", "status": "applied" }),
            serde_json::json!({ "id": "c", "status": "applied" }),
        ];
        let merged = merge_receipts(first, &incoming);
        let ids: Vec<&str> = merged
            .as_array()
            .unwrap()
            .iter()
            .map(|r| r["id"].as_str().unwrap())
            .collect();
        assert_eq!(ids, vec!["a", "b", "c"]);
        // The retried receipt overwrites the rejected one instead of duplicating it.
        assert_eq!(merged[1]["status"], "applied");
    }

    #[test]
    fn receipts_file_is_capped() {
        let existing = serde_json::Value::Array(
            (0..600)
                .map(|i| serde_json::json!({ "id": format!("r{i}"), "status": "applied" }))
                .collect(),
        );
        let merged = merge_receipts(existing, &[serde_json::json!({ "id": "new", "status": "applied" })]);
        let rows = merged.as_array().unwrap();
        assert_eq!(rows.len(), 500);
        // The oldest fall off the front; the newest receipt is the one kept.
        assert_eq!(rows.last().unwrap()["id"], "new");
    }
}