/**
 * A fresh id for a row created in the browser.
 *
 * `crypto.randomUUID` only exists in a secure context. The app is also opened
 * over plain HTTP from the LAN server (`http://192.168.x.x`), where Safari on
 * iOS and Chromium both report `isSecureContext === false` and leave
 * `crypto.randomUUID` undefined — calling it there throws a TypeError and the
 * tap appears to do nothing. The fallback keeps the same practical uniqueness
 * for rows that only ever live in this device's store.
 */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
