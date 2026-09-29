/**
 * Local notifications — the rest timer keeps talking when the tab does not.
 *
 * Two channels, one API
 * ---------------------
 * TrainingLab is a static, offline, zero-backend app that runs in a browser *and*
 * inside its Tauri desktop shell, and those two hosts need different mechanisms:
 *
 *   * **browser** → the Web Notification API. No service worker, no push server,
 *     no network — which is what "100 % local" has to mean here.
 *   * **desktop shell** → `tauri-plugin-notification`. A WebView has no usable
 *     `Notification` global, so the plugin is what turns the alert into a real
 *     Windows toast. It is imported dynamically, so the browser build never
 *     bundles it and never fails to resolve it.
 *
 * Either way nothing is ever *pushed*: every notification is raised by an event
 * the user just caused (a rest countdown reaching zero). `isDesktopShell()`
 * decides the branch; permission and payload logic are shared.
 *
 * @module lib/notifications
 */

import { t, tInterp } from "./i18n";

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

/**
 * The subset of `@tauri-apps/plugin-notification` this module uses.
 *
 * Imported dynamically and typed by hand, so the web build neither bundles the
 * plugin nor fails to resolve it: in a browser `isDesktopShell()` is false and
 * the import never runs.
 */
interface TauriNotificationApi {
  isPermissionGranted(): Promise<boolean>;
  requestPermission(): Promise<string>;
  sendNotification(options: { title: string; body?: string }): void;
}

async function loadTauriNotifications(): Promise<TauriNotificationApi | null> {
  try {
    const mod = (await import("@tauri-apps/plugin-notification")) as unknown as TauriNotificationApi;
    return typeof mod.sendNotification === "function" ? mod : null;
  } catch {
    // The plugin is missing (web build, or a shell built before it was added).
    return null;
  }
}

interface NotificationConfig {
  enabled: boolean;
  /**
   * Also notify while the document is in the foreground.
   *
   * Off by default: when the rest timer is on screen there is already a visible,
   * audible countdown, and a second alert for something the user is looking at
   * is noise.
   */
  alsoWhenVisible: boolean;
}

const config: NotificationConfig = { enabled: true, alsoWhenVisible: false };

/** Apply the user's preferences (called from Settings and on load). */
export function configureNotifications(
  next: Partial<NotificationConfig>,
): void {
  if (typeof next.enabled === "boolean") config.enabled = next.enabled;
  if (typeof next.alsoWhenVisible === "boolean") {
    config.alsoWhenVisible = next.alsoWhenVisible;
  }
}

export function notificationConfig(): Readonly<NotificationConfig> {
  return { ...config };
}/** True when the runtime can show a notification at all (permission aside). */
export function notificationsSupported(): boolean {
  // The shell always can: the plugin is compiled into the binary.
  if (isDesktopShell()) return true;
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { Notification?: unknown }).Notification === "function"
  );
}

/**
 * True inside a packaged desktop shell.
 *
 * Tauri injects `__TAURI_INTERNALS__` into the window; the check is guarded so it
 * is safe in a plain browser and in Node.
 */
export function isDesktopShell(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !==
      "undefined"
  );
}

/**
 * Current permission, collapsed to a value the UI can switch on.
 *
 * Synchronous on purpose — the Settings panel reads it while rendering. Inside
 * the desktop shell the plugin only answers asynchronously, so this reports
 * `default` ("not asked yet"), which is both true at first launch and the state
 * whose UI affordance — a button — is the right one to show.
 */
export function notificationPermission(): NotifyPermission {
  if (isDesktopShell()) return "default";
  if (!notificationsSupported()) return "unsupported";
  const state = Notification.permission;
  return state === "granted" || state === "denied" ? state : "default";
}

/**
 * Ask for permission. Must be called from a user gesture on most browsers, which
 * is why the Settings panel owns the button that calls it.
 *
 * Never rejects: an unsupported or throwing implementation resolves to
 * `unsupported`.
 */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (isDesktopShell()) {
    const api = await loadTauriNotifications();
    if (!api) return "unsupported";
    try {
      if (await api.isPermissionGranted()) return "granted";
      return (await api.requestPermission()) === "granted" ? "granted" : "denied";
    } catch {
      return "unsupported";
    }
  }

  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return (await Notification.requestPermission()) as NotifyPermission;
  } catch {
    return notificationPermission();
  }
}

export interface NotifyOptions {
  title: string;
  body: string;
  /**
   * Reuse a tag to replace the previous notification with the same tag instead
   * of stacking them — one rest timer, one toast.
   */
  tag?: string;
  /** Skip the OS sound; the app's own cues already played. */
  silent?: boolean;
}

/**
 * Raise one notification.
 *
 * Returns `true` only when a notification was actually shown, so callers (and
 * tests) can tell "I decided not to" from "the platform refused".
 */
export function notify({
  title,
  body,
  tag,
  silent = false,
}: NotifyOptions): boolean {
  if (!config.enabled) return false;
  if (!notificationsSupported()) return false;

  // Foreground: the on-screen timer is the notification.
  if (
    !config.alsoWhenVisible &&
    typeof document !== "undefined" &&
    !document.hidden
  ) {
    return false;
  }

  // ── Desktop shell ────────────────────────────────────────────────────────
  // A WebView has no usable Notification API, so the plugin is the only channel
  // that produces a real OS toast. It is async and `notify` is called from a
  // 1-second interval that must not block, so this is dispatched rather than
  // awaited: the return value means "handed to a channel", not "already
  // painted".
  if (isDesktopShell()) {
    void (async () => {
      const api = await loadTauriNotifications();
      if (!api) return;
      try {
        if (!(await api.isPermissionGranted())) return;
        api.sendNotification({ title, body });
      } catch {
        /* a denied permission is not worth surfacing mid-set */
      }
    })();
    return true;
  }

  if (Notification.permission !== "granted") return false;

  try {
    const shown = new Notification(title, { body, tag, silent });
    // Some hosts hand back an object they immediately close; ignore it, but keep
    // the click behaviour harmless (never navigate away from the workout).
    shown.onclick = () => {
      try {
        if (typeof window !== "undefined") window.focus();
        shown.close();
      } catch {
        /* nothing to do */
      }
    };
    return true;
  } catch {
    // Constructing a Notification can throw on some hosts (e.g. Android Chrome
    // requires a service worker registration). Silence is the right failure.
    return false;
  }
}

/**
 * The rest countdown reaching zero.
 *
 * Separate from {@link notify} so the copy lives with the event rather than in
 * the timer component, and so the "which exercise is next" decision is testable.
 */
export function notifyRestDone(nextExercise: string | null): boolean {
  return notify({
    title: t("app.title"),
    body: nextExercise
      ? tInterp("notif.restNext", { name: nextExercise })
      : t("notif.restDone"),
    tag: "tl-rest",
    // The app plays its own cue for this moment; the toast is the visual echo.
    silent: true,
  });
}

/** Test-only: restore the defaults and drop cached state. */
export function resetNotificationsForTests(): void {
  config.enabled = true;
  config.alsoWhenVisible = false;
}
