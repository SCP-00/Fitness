/**
 * Update checker — opt-in, manual, zero telemetry.
 *
 * Uses @tauri-apps/plugin-updater (backed by tauri-plugin-updater in the Rust
 * shell). All methods are safe no-ops outside the Tauri desktop shell (web /
 * GitHub Pages build), so pages can call them unconditionally.
 *
 * Updates are NEVER downloaded automatically: the user must click
 * "Buscar actualizaciones" in Settings → then explicitly install. Privacy
 * model: a check is a single GET of a static latest.json from the project's
 * GitHub releases; nothing about the device or user is sent.
 *
 * The HTTP request itself is performed by the Rust process (not the webview),
 * so the webview CSP `connect-src` does not need an exception for GitHub.
 */

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'installing' | 'error';
  /** Semver of the update, when one is available. */
  version?: string;
  /** Release notes / changelog body, when provided. */
  notes?: string;
  /** 0-1 progress while downloading (null when not applicable). */
  progress?: number | null;
  error?: string;
}

type TauriUpdaterModule = typeof import('@tauri-apps/plugin-updater');
type RelaunchModule = typeof import('@tauri-apps/plugin-process');

/** True when running inside the Tauri desktop webview. */
function isDesktopShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Lazily load the plugin APIs; throws only if called outside Tauri. */
async function loadPlugin(): Promise<TauriUpdaterModule> {
  return import('@tauri-apps/plugin-updater');
}

/**
 * Check GitHub releases for a newer version.
 * Returns null when no update is available (already up to date, or web build).
 */
export async function checkForUpdate(
  onState?: (state: UpdateState) => void,
): Promise<{ version: string; notes?: string } | null> {
  if (!isDesktopShell()) {
    onState?.({ status: 'up-to-date' });
    return null;
  }
  try {
    onState?.({ status: 'checking' });
    const { check } = await loadPlugin();
    const update = await check();
    if (!update) {
      onState?.({ status: 'up-to-date' });
      return null;
    }
    const version = update.version;
    const notes = update.body ?? undefined;
    onState?.({ status: 'available', version, notes });
    return { version, notes };
  } catch (err) {
    onState?.({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Download + install the pending update and relaunch.
 * Progress is reported 0→1 while the payload downloads.
 */
export async function downloadAndInstallUpdate(
  onState?: (state: UpdateState) => void,
): Promise<boolean> {
  if (!isDesktopShell()) return false;
  try {
    onState?.({ status: 'downloading', progress: 0 });
    const { check } = await loadPlugin();
    const update = await check();
    if (!update) {
      onState?.({ status: 'up-to-date' });
      return false;
    }

    let received = 0;
    let contentLength: number | null = null;
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength ?? null;
          break;
        case 'Progress':
          received += event.data.chunkLength;
          onState?.({
            status: 'downloading',
            version: update.version,
            progress: contentLength ? received / contentLength : null,
          });
          break;
        case 'Finished':
          onState?.({ status: 'installing', version: update.version });
          break;
      }
    });

    // The NSIS installer exits the app; relaunch is best-effort for portable runs.
    try {
      const { relaunch } = (await import('@tauri-apps/plugin-process')) as RelaunchModule;
      await relaunch();
    } catch {
      // installer already terminated the process — nothing to do
    }
    return true;
  } catch (err) {
    onState?.({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
