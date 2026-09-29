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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running TrainingLab");
}
