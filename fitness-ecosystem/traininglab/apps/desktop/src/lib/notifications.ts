/**
 * Local notifications — the rest timer keeps talking when the tab does not.
 *
 * Why the Web Notification API
 * ----------------------------
 * TrainingLab is a static, offline, zero-backend app that runs both in a browser
 * and inside a desktop shell. The Web Notification API is the only mechanism
 * that covers every one of those surfaces with one code path, needs no service
 * worker, no push server and no network — which is what "100 % local" has to mean
 * here. Nothing is ever *pushed*: every notification is raised by an event the
 * user just caused (a rest countdown reaching zero).
 *
 * The honest limitation, stated rather than hidden: on Windows the toast comes
 * from the browser (or the WebView host), and a desktop shell that wants its own
 * native notification channel needs the Tauri notification plugin wired into the
 * Rust side. `isDesktopShell()` below marks the one branch that would change; the
 * permission and payload logic stays identical.
 *
 * @module lib/notifications
 */

import { t, tInterp } from "./i18n";

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

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
}

/** True when the runtime exposes the API at all (independent of permission). */
export function notificationsSupported(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { Notification?: unknown }).Notification ===
      "function"
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

/** Current permission, collapsed to a value the UI can switch on. */
export function notificationPermission(): NotifyPermission {
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
  if (Notification.permission !== "granted") return false;

  // Foreground: the on-screen timer is the notification.
  if (
    !config.alsoWhenVisible &&
    typeof document !== "undefined" &&
    !document.hidden
  ) {
    return false;
  }

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
